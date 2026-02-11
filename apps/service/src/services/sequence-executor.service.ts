import { getSupabaseClient } from './supabase.service';

interface ExecuteParams {
  coachId: string;
  clientId: string;
  packageId: string;
  sequenceId: string;
}

interface FlowNode {
  id: string;
  type: string;
  data: {
    actionSchema?: {
      type: string;
      payload: string | string[];
    };
    [key: string]: any;
  };
  [key: string]: any;
}

class SequenceExecutorService {
  async execute({ coachId, clientId, packageId, sequenceId }: ExecuteParams): Promise<void> {
    const supabase = getSupabaseClient();

    console.log('[Sequence] Starting execution', { coachId, clientId, packageId, sequenceId });

    // Atomically claim execution — only one concurrent call can win
    // Uses client_package_assignments.sequence_executed_at for idempotency
    const { data: claimed, error: claimError } = await supabase
      .from('client_package_assignments')
      .update({ sequence_executed_at: new Date().toISOString() })
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .eq('package_id', packageId)
      .is('sequence_executed_at', null)
      .select('id');

    if (claimError) {
      console.error('[Sequence] Claim failed:', claimError);
      return;
    }

    if (!claimed?.length) {
      console.log('[Sequence] Already executed, skipping');
      return;
    }

    // 1. Fetch sequence
    const { data: sequence, error: fetchError } = await supabase
      .from('coach_sequences')
      .select('flow_data')
      .eq('id', sequenceId)
      .single();

    if (fetchError || !sequence) {
      console.error('[Sequence] Failed to fetch sequence', { sequenceId, error: fetchError });
      return;
    }

    const flowData = sequence.flow_data as { nodes?: FlowNode[] } | null;
    const nodes = flowData?.nodes || [];

    // Simply filter action nodes — no graph walking needed
    const actionNodes = nodes.filter(
      (n: FlowNode) => n.type === 'action' && n.data?.actionSchema?.type
    );

    if (actionNodes.length === 0) {
      console.log('[Sequence] No action nodes found, skipping');
      return;
    }

    console.log('[Sequence] Executing', actionNodes.length, 'actions:', actionNodes.map(n => n.data.actionSchema?.type));

    // 2. Execute each action
    for (const node of actionNodes) {
      const { type, payload } = node.data.actionSchema!;
      try {
        switch (type) {
          case 'send-message':
            await this.handleSendMessage(supabase, coachId, clientId, payload as string);
            break;
          case 'assign-questionnaire':
            await this.handleAssignQuestionnaires(supabase, coachId, clientId, payload as string[]);
            break;
          case 'assign-check-in':
            await this.handleAssignCheckIns(supabase, coachId, clientId, payload as string[]);
            break;
          case 'add-file':
            await this.handleAddFiles(supabase, coachId, clientId, payload as string[]);
            break;
          case 'add-habit':
            await this.handleAddHabits(supabase, coachId, clientId, payload as string[]);
            break;
          case 'add-metric':
            await this.handleAddMetrics(supabase, coachId, clientId, payload as string[]);
            break;
          default:
            console.warn('[Sequence] Unknown action type:', type);
        }
      } catch (err) {
        console.error('[Sequence] Action failed:', { type, nodeId: node.id, error: err });
        // Continue with remaining actions
      }
    }

    console.log('[Sequence] Execution complete', { coachId, clientId, packageId, sequenceId });
  }

  private async handleSendMessage(supabase: any, coachId: string, clientId: string, message: string): Promise<void> {
    // Find the conversation (created by DB trigger on assignment accept)
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (!conversation) {
      console.warn('[Sequence] No conversation found for send-message, skipping');
      return;
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: coachId,
        content: message,
        message_type: 'text',
        status: 'sent',
      });

    if (error) throw error;
    console.log('[Sequence] Message sent');
  }

  private async handleAssignQuestionnaires(supabase: any, coachId: string, clientId: string, ids: string[]): Promise<void> {
    if (!ids?.length) return;

    const { data: templates, error: fetchError } = await supabase
      .from('coach_questionnaires')
      .select('*')
      .in('id', ids)
      .eq('coach_id', coachId);

    if (fetchError || !templates?.length) {
      console.warn('[Sequence] No questionnaire templates found for IDs:', ids);
      return;
    }

    const inserts = templates.map((t: any) => ({
      client_id: clientId,
      coach_id: coachId,
      name: t.name,
      description: t.description,
      questions: t.questions || [],
      status: 'pending',
      sent_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('client_questionnaires').insert(inserts);
    if (error) throw error;
    console.log('[Sequence] Assigned', inserts.length, 'questionnaires');
  }

  private async handleAssignCheckIns(supabase: any, coachId: string, clientId: string, ids: string[]): Promise<void> {
    if (!ids?.length) return;

    const { data: templates, error: fetchError } = await supabase
      .from('coach_checkins')
      .select('*')
      .in('id', ids)
      .eq('coach_id', coachId);

    if (fetchError || !templates?.length) {
      console.warn('[Sequence] No check-in templates found for IDs:', ids);
      return;
    }

    const inserts = templates.map((t: any) => {
      const hasQuestions = t.questions && Array.isArray(t.questions) && t.questions.length > 0;
      return {
        client_id: clientId,
        coach_id: coachId,
        name: t.name,
        description: t.description,
        questions: t.questions || [],
        schedule_config: t.schedule_config,
        cron_expression: t.cron_expression,
        status: hasQuestions ? 'live' : 'draft',
      };
    });

    const { error } = await supabase.from('client_checkins').insert(inserts);
    if (error) throw error;
    console.log('[Sequence] Assigned', inserts.length, 'check-ins');
  }

  private async handleAddFiles(supabase: any, coachId: string, clientId: string, ids: string[]): Promise<void> {
    if (!ids?.length) return;

    const { data: coachFiles, error: fetchError } = await supabase
      .from('coach_files')
      .select('*')
      .in('id', ids)
      .eq('coach_id', coachId);

    if (fetchError || !coachFiles?.length) {
      console.warn('[Sequence] No file templates found for IDs:', ids);
      return;
    }

    const inserts = coachFiles.map((f: any) => ({
      client_id: clientId,
      coach_id: coachId,
      filename: f.filename,
      display_name: f.filename,
      file_path: f.file_path,
      mime_type: f.mime_type,
      size: f.size,
    }));

    const { error } = await supabase.from('client_files').insert(inserts);
    if (error) throw error;
    console.log('[Sequence] Assigned', inserts.length, 'files');
  }

  private async handleAddHabits(supabase: any, coachId: string, clientId: string, ids: string[]): Promise<void> {
    if (!ids?.length) return;

    const { data: templates, error: fetchError } = await supabase
      .from('coach_habits')
      .select('*')
      .in('id', ids)
      .eq('coach_id', coachId);

    if (fetchError || !templates?.length) {
      console.warn('[Sequence] No habit templates found for IDs:', ids);
      return;
    }

    const inserts = templates.map((h: any) => {
      const scheduleConfig = h.schedule_config || {};
      return {
        client_id: clientId,
        coach_id: coachId,
        name: h.name,
        description: h.description,
        schedule_type: h.schedule_type,
        days_of_week: h.days_of_week,
        times_of_day: h.times_of_day,
        timezone: h.timezone,
        start_date: h.start_date,
        end_date: h.end_date,
        schedule_config: h.schedule_config,
        amount: scheduleConfig.amount ?? null,
        unit: scheduleConfig.unit ?? null,
        period: scheduleConfig.period ?? h.schedule_type,
      };
    });

    const { error } = await supabase.from('client_habits').insert(inserts);
    if (error) throw error;
    console.log('[Sequence] Assigned', inserts.length, 'habits');
  }

  private async handleAddMetrics(supabase: any, coachId: string, clientId: string, ids: string[]): Promise<void> {
    if (!ids?.length) return;

    const { data: templates, error: fetchError } = await supabase
      .from('coach_metrics')
      .select('*')
      .in('id', ids)
      .eq('coach_id', coachId);

    if (fetchError || !templates?.length) {
      console.warn('[Sequence] No metric templates found for IDs:', ids);
      return;
    }

    const inserts = templates.map((m: any) => ({
      client_id: clientId,
      coach_id: coachId,
      name: m.name,
      unit: m.unit,
      description: m.description,
      value_kind: m.value_kind,
      min_value: m.min_value,
      max_value: m.max_value,
      cron_expression: m.cron_expression,
      schedule_config: m.schedule_config,
    }));

    const { error } = await supabase.from('client_metrics').insert(inserts);
    if (error) throw error;
    console.log('[Sequence] Assigned', inserts.length, 'metrics');
  }
}

export const sequenceExecutor = new SequenceExecutorService();
