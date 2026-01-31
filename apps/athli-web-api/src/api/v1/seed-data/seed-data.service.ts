import { getSupabaseClient } from '../../../services/supabase.service';
import {
  // Utils
  TEST_CLIENTS,
  TEST_PREFIX,
  // Coach Library
  getCoachMetrics,
  getCoachHabits,
  getCoachCheckIns,
  getCoachQuestionnaires,
  getCoachExercises,
  getCoachWorkouts,
  getCoachPrograms,
  getCoachSections,
  // Clients
  getTestClientAuthData,
  getClientProfileData,
  getCoachClientAssignmentData,
  getClientTrainingSummaryData,
  // Client Data (private coach data about clients)
  getClientBio,
  getClientGoals,
  getClientInjuries,
  getClientNotes,
  getClientPhotoLogs,
  // Client Assignments
  getClientMetricAssignments,
  getClientHabitAssignments,
  getClientCheckInAssignments,
  getClientQuestionnaireAssignments,
  // Client Logs with Assignments
  getClientMetricLogsWithAssignments,
  getClientHabitLogsWithAssignments,
  getClientCheckInLogsWithAssignments,
  getClientQuestionnaireLogsWithAssignments,
  // Training
  getClientTrainingData,
  getClientTrainingHistory,
  getCoachTodoItems,
  // Messaging
  getConversation,
  getConversationParticipants,
  getMessages,
  getMessageAttachments,
  getMessageReactions,
  getReadReceipts,
} from '../../../seed_data';

interface SeedDataResult {
  coachLibrary: {
    metrics: number;
    habits: number;
    files: number;
    checkIns: number;
    questionnaires: number;
    exercises: number;
    workouts: number;
    programs: number;
    sections: number;
  };
  clients: number;
  privateData: {
    bios: number;
    goals: number;
    injuries: number;
    notes: number;
    photos: number;
  };
  clientAssignments: {
    metrics: number;
    habits: number;
    checkIns: number;
    questionnaires: number;
  };
  clientLogs: {
    metricLogs: number;
    habitLogs: number;
    checkInLogs: number;
    questionnaireLogs: number;
  };
  training: {
    trainingEntries: number;
    historyEntries: number;
  };
  todos: {
    ownTodos: number;
    autoTodos: number;
  };
  messaging: {
    conversations: number;
    messages: number;
    attachments: number;
    reactions: number;
  };
}

interface RemoveDataResult {
  deletedClients: number;
  deletedItems: {
    coachMetrics: number;
    coachHabits: number;
    coachFiles: number;
    coachCheckIns: number;
    coachQuestionnaires: number;
    coachExercises: number;
    coachWorkouts: number;
    coachPrograms: number;
    coachSections: number;
    ownTodos: number;
    autoTodos: number;
    conversations: number;
  };
}

export const seedDataService = {
  /**
   * Add comprehensive seed data for a coach
   * First removes any existing test data, then inserts fresh data
   */
  addSeedData: async (coachId: string): Promise<SeedDataResult> => {
    const supabase = getSupabaseClient();
    const result: SeedDataResult = {
      coachLibrary: { metrics: 0, habits: 0, files: 0, checkIns: 0, questionnaires: 0, exercises: 0, workouts: 0, programs: 0, sections: 0 },
      clients: 0,
      privateData: { bios: 0, goals: 0, injuries: 0, notes: 0, photos: 0 },
      clientAssignments: { metrics: 0, habits: 0, checkIns: 0, questionnaires: 0 },
      clientLogs: { metricLogs: 0, habitLogs: 0, checkInLogs: 0, questionnaireLogs: 0 },
      training: { trainingEntries: 0, historyEntries: 0 },
      todos: { ownTodos: 0, autoTodos: 0 },
      messaging: { conversations: 0, messages: 0, attachments: 0, reactions: 0 },
    };

    // First, remove any existing test data to avoid duplicates
    await seedDataService.removeSeedData(coachId);

    // ==========================================
    // Level 1: Coach Library
    // ==========================================

    // 1. Coach Metrics
    const metricsData = getCoachMetrics(coachId);
    const { data: metrics, error: metricsError } = await supabase
      .from('coach_metrics')
      .insert(metricsData)
      .select();
    if (metricsError) console.error('Error creating metrics:', metricsError);
    result.coachLibrary.metrics = metrics?.length || 0;

    // 2. Coach Habits
    const habitsData = getCoachHabits(coachId);
    const { data: habits, error: habitsError } = await supabase
      .from('coach_habits')
      .insert(habitsData)
      .select();
    if (habitsError) console.error('Error creating habits:', habitsError);
    result.coachLibrary.habits = habits?.length || 0;

    // 3. Coach Files (skip for now - requires actual file upload to storage)
    result.coachLibrary.files = 0;

    // 4. Coach Check-ins
    const checkInsData = getCoachCheckIns(coachId);
    const { data: checkIns, error: checkInsError } = await supabase
      .from('coach_checkins')
      .insert(checkInsData)
      .select();
    if (checkInsError) console.error('Error creating check-ins:', checkInsError);
    result.coachLibrary.checkIns = checkIns?.length || 0;

    // 5. Coach Questionnaires
    const questionnairesData = getCoachQuestionnaires(coachId);
    const { data: questionnaires, error: questionnairesError } = await supabase
      .from('coach_questionnaires')
      .insert(questionnairesData)
      .select();
    if (questionnairesError) console.error('Error creating questionnaires:', questionnairesError);
    result.coachLibrary.questionnaires = questionnaires?.length || 0;

    // 6. Coach Exercises
    const exercisesData = getCoachExercises(coachId);
    const { data: exercises, error: exercisesError } = await supabase
      .from('coach_exercises')
      .insert(exercisesData)
      .select();
    if (exercisesError) console.error('Error creating exercises:', exercisesError);
    result.coachLibrary.exercises = exercises?.length || 0;

    // 7. Coach Workouts (uses existing exercise IDs from exercises.json)
    const workoutsData = getCoachWorkouts(coachId);
    const { data: workouts, error: workoutsError } = await supabase
      .from('coach_workouts')
      .insert(workoutsData)
      .select();
    if (workoutsError) console.error('Error creating workouts:', workoutsError);
    result.coachLibrary.workouts = workouts?.length || 0;
    const workoutIds = workouts?.map(w => w.id) || [];

    // 8. Coach Programs (depends on workouts)
    const programsData = getCoachPrograms(coachId, workoutIds);
    const { data: programs, error: programsError } = await supabase
      .from('coach_programs')
      .insert(programsData)
      .select();
    if (programsError) console.error('Error creating programs:', programsError);
    result.coachLibrary.programs = programs?.length || 0;

    // 9. Coach Sections (uses existing exercise IDs from exercises.json)
    const sectionsData = getCoachSections(coachId);
    const { data: sections, error: sectionsError } = await supabase
      .from('coach_sections')
      .insert(sectionsData)
      .select();
    if (sectionsError) console.error('Error creating sections:', sectionsError);
    result.coachLibrary.sections = sections?.length || 0;

    // ==========================================
    // Level 2: Test Clients
    // ==========================================
    const clientIds: string[] = [];

    for (const client of TEST_CLIENTS) {
      try {
        // Check if user already exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', client.email)
          .single();

        let clientId: string;

        if (existingProfile) {
          clientId = existingProfile.id;
        } else {
          // Create auth user
          const authData = getTestClientAuthData(client);
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser(authData);

          if (authError) {
            console.error(`Error creating auth user for ${client.email}:`, authError);
            continue;
          }

          clientId = authUser.user.id;
        }

        // Update client_profiles (includes coach_id)
        const profileData = getClientProfileData(clientId, coachId, client);
        const { error: profileError } = await supabase
          .from('client_profiles')
          .upsert(profileData, { onConflict: 'client_id' });
        if (profileError) {
          console.error(`Error upserting profile for client ${clientId}:`, profileError);
        }

        // Create/update coach_client_assignments
        const assignmentData = getCoachClientAssignmentData(coachId, clientId, client);
        await supabase
          .from('coach_client_assignments')
          .upsert(assignmentData, { onConflict: 'coach_id, client_id' });

        // Initialize training summary - PK is just client_id
        const summaryData = getClientTrainingSummaryData(coachId, clientId);
        const { error: summaryError } = await supabase
          .from('client_training_summary')
          .upsert(summaryData, { onConflict: 'client_id' });
        if (summaryError) {
          console.error(`Error upserting training summary for client ${clientId}:`, summaryError);
        }

        clientIds.push(clientId);
        result.clients++;
      } catch (error) {
        console.error(`Error creating client ${client.email}:`, error);
      }
    }

    // ==========================================
    // Level 3: Client Assignments
    // ==========================================
    // Create client-specific copies of coach library items for each client
    const clientMetricAssignmentIds: Map<string, string[]> = new Map();
    const clientHabitAssignmentIds: Map<string, string[]> = new Map();
    const clientCheckInAssignmentIds: Map<string, string[]> = new Map();
    const clientQuestionnaireAssignmentIds: Map<string, string[]> = new Map();

    for (const clientId of clientIds) {
      // Metric Assignments
      const metricAssignmentsData = getClientMetricAssignments(coachId, clientId, metrics || []);
      if (metricAssignmentsData.length > 0) {
        const { data: metricAssignments, error: metricAssignmentsError } = await supabase
          .from('client_metrics')
          .insert(metricAssignmentsData)
          .select();
        if (metricAssignmentsError) {
          console.error(`Error creating metric assignments for client ${clientId}:`, metricAssignmentsError);
        } else {
          clientMetricAssignmentIds.set(clientId, metricAssignments?.map(m => m.id) || []);
          result.clientAssignments.metrics += metricAssignments?.length || 0;
        }
      }

      // Habit Assignments
      const habitAssignmentsData = getClientHabitAssignments(coachId, clientId, habits || []);
      if (habitAssignmentsData.length > 0) {
        const { data: habitAssignments, error: habitAssignmentsError } = await supabase
          .from('client_habits')
          .insert(habitAssignmentsData)
          .select();
        if (habitAssignmentsError) {
          console.error(`Error creating habit assignments for client ${clientId}:`, habitAssignmentsError);
        } else {
          clientHabitAssignmentIds.set(clientId, habitAssignments?.map(h => h.id) || []);
          result.clientAssignments.habits += habitAssignments?.length || 0;
        }
      }

      // Check-In Assignments
      const checkInAssignmentsData = getClientCheckInAssignments(coachId, clientId, checkIns || []);
      if (checkInAssignmentsData.length > 0) {
        const { data: checkInAssignments, error: checkInAssignmentsError } = await supabase
          .from('client_checkins')
          .insert(checkInAssignmentsData)
          .select();
        if (checkInAssignmentsError) {
          console.error(`Error creating check-in assignments for client ${clientId}:`, checkInAssignmentsError);
        } else {
          clientCheckInAssignmentIds.set(clientId, checkInAssignments?.map(c => c.id) || []);
          result.clientAssignments.checkIns += checkInAssignments?.length || 0;
        }
      }

      // Questionnaire Assignments
      const questionnaireAssignmentsData = getClientQuestionnaireAssignments(coachId, clientId, questionnaires || []);
      if (questionnaireAssignmentsData.length > 0) {
        const { data: questionnaireAssignments, error: questionnaireAssignmentsError } = await supabase
          .from('client_questionnaires')
          .insert(questionnaireAssignmentsData)
          .select();
        if (questionnaireAssignmentsError) {
          console.error(`Error creating questionnaire assignments for client ${clientId}:`, questionnaireAssignmentsError);
        } else {
          clientQuestionnaireAssignmentIds.set(clientId, questionnaireAssignments?.map(q => q.id) || []);
          result.clientAssignments.questionnaires += questionnaireAssignments?.length || 0;
        }
      }
    }

    // ==========================================
    // Level 4: Coach Private Data
    // ==========================================
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const clientName = TEST_CLIENTS[i].name;

      // Client Bio - unique constraint is on client_id only
      const bioData = getClientBio(coachId, clientId, clientName);
      const { error: bioError } = await supabase.from('client_bio').upsert(bioData, { onConflict: 'client_id' });
      if (bioError) {
        console.error(`Error creating bio for client ${clientId}:`, bioError);
      } else {
        result.privateData.bios++;
      }

      // Client Goals
      const goalsData = getClientGoals(coachId, clientId);
      const { data: goals, error: goalsError } = await supabase.from('client_goals').insert(goalsData).select();
      if (goalsError) {
        console.error(`Error creating goals for client ${clientId}:`, goalsError);
      }
      result.privateData.goals += goals?.length || 0;

      // Client Injuries
      const injuriesData = getClientInjuries(coachId, clientId);
      if (injuriesData.length > 0) {
        const { data: injuries, error: injuriesError } = await supabase.from('client_injuries').insert(injuriesData).select();
        if (injuriesError) {
          console.error(`Error creating injuries for client ${clientId}:`, injuriesError);
        }
        result.privateData.injuries += injuries?.length || 0;
      }

      // Client Notes
      const notesData = getClientNotes(coachId, clientId);
      const { data: notes, error: notesError } = await supabase.from('client_notes').insert(notesData).select();
      if (notesError) {
        console.error(`Error creating notes for client ${clientId}:`, notesError);
      }
      result.privateData.notes += notes?.length || 0;

      // Photo Logs
      const photoLogsData = getClientPhotoLogs(coachId, clientId);
      if (photoLogsData.length > 0) {
        const { data: photoLogs, error: photoLogsError } = await supabase
          .from('client_photo_logs')
          .insert(photoLogsData)
          .select();
        if (photoLogsError) {
          console.error(`Error creating photo logs for client ${clientId}:`, photoLogsError);
        }
        result.privateData.photos += photoLogs?.length || 0;
      }
    }

    // ==========================================
    // Level 5: Client Logs
    // ==========================================
    for (const clientId of clientIds) {
      // Metric Logs
      const metricAssignmentIds = clientMetricAssignmentIds.get(clientId) || [];
      if (metricAssignmentIds.length > 0) {
        const metricLogsData = getClientMetricLogsWithAssignments(coachId, clientId, metricAssignmentIds);
        if (metricLogsData.length > 0) {
          const { data: metricLogs, error: metricLogsError } = await supabase
            .from('client_metric_logs')
            .insert(metricLogsData)
            .select();
          if (metricLogsError) {
            console.error(`Error creating metric logs for client ${clientId}:`, metricLogsError);
          }
          result.clientLogs.metricLogs += metricLogs?.length || 0;
        }
      }

      // Habit Logs
      const habitAssignmentIds = clientHabitAssignmentIds.get(clientId) || [];
      if (habitAssignmentIds.length > 0) {
        const habitLogsData = getClientHabitLogsWithAssignments(coachId, clientId, habitAssignmentIds);
        if (habitLogsData.length > 0) {
          const { data: habitLogs, error: habitLogsError } = await supabase
            .from('client_habit_logs')
            .insert(habitLogsData)
            .select();
          if (habitLogsError) {
            console.error(`Error creating habit logs for client ${clientId}:`, habitLogsError);
          }
          result.clientLogs.habitLogs += habitLogs?.length || 0;
        }
      }

      // Check-In Logs
      const checkInAssignmentIds = clientCheckInAssignmentIds.get(clientId) || [];
      if (checkInAssignmentIds.length > 0) {
        const checkInLogsData = getClientCheckInLogsWithAssignments(coachId, clientId, checkInAssignmentIds);
        if (checkInLogsData.length > 0) {
          const { data: checkInLogs, error: checkInLogsError } = await supabase
            .from('client_checkin_logs')
            .insert(checkInLogsData)
            .select();
          if (checkInLogsError) {
            console.error(`Error creating check-in logs for client ${clientId}:`, checkInLogsError);
          }
          result.clientLogs.checkInLogs += checkInLogs?.length || 0;
        }
      }

      // Questionnaire Logs
      const questionnaireAssignmentIds = clientQuestionnaireAssignmentIds.get(clientId) || [];
      if (questionnaireAssignmentIds.length > 0) {
        const questionnaireLogsData = getClientQuestionnaireLogsWithAssignments(coachId, clientId, questionnaireAssignmentIds);
        if (questionnaireLogsData.length > 0) {
          const { data: questionnaireLogs, error: questionnaireLogsError } = await supabase
            .from('client_questionnaire_logs')
            .insert(questionnaireLogsData)
            .select();
          if (questionnaireLogsError) {
            console.error(`Error creating questionnaire logs for client ${clientId}:`, questionnaireLogsError);
          }
          result.clientLogs.questionnaireLogs += questionnaireLogs?.length || 0;
        }
      }
    }

    // ==========================================
    // Level 6: Training Data
    // ==========================================
    for (const clientId of clientIds) {
      // Generate training data
      const trainingData = getClientTrainingData(coachId, clientId, workouts || []);

      for (const entry of trainingData) {
        // Upsert training entry - PK is (client_id, date, coach_id)
        // Remove internal _status and _workoutId fields before insert
        const { _status, _workoutId, ...trainingEntry } = entry;
        const { error: trainingError } = await supabase
          .from('client_training')
          .upsert(trainingEntry, { onConflict: 'client_id, date, coach_id' });
        if (trainingError) {
          console.error(`Error upserting training for client ${clientId} on ${entry.date}:`, trainingError);
        } else {
          result.training.trainingEntries++;
        }
      }

      // Generate training history - uses upsert since PK is composite
      const historyData = getClientTrainingHistory(coachId, clientId, trainingData);
      if (historyData.length > 0) {
        const { data: history, error: historyError } = await supabase
          .from('client_training_history')
          .upsert(historyData, { onConflict: 'client_id, coach_id, date, workout_id' })
          .select();
        if (historyError) {
          console.error(`Error creating training history for client ${clientId}:`, historyError);
        }
        result.training.historyEntries += history?.length || 0;
      }
    }

    // ==========================================
    // Level 7: Coach Todo Lists
    // ==========================================
    const { ownTodos, autoTodos } = getCoachTodoItems(coachId, clientIds);

    if (ownTodos.length > 0) {
      const { data: todos } = await supabase
        .from('coach_own_todolist')
        .insert(ownTodos)
        .select();
      result.todos.ownTodos = todos?.length || 0;
    }

    if (autoTodos.length > 0) {
      const { data: todos } = await supabase
        .from('coach_auto_todolist')
        .insert(autoTodos)
        .select();
      result.todos.autoTodos = todos?.length || 0;
    }

    // ==========================================
    // Level 8: Messaging
    // ==========================================
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const clientName = TEST_CLIENTS[i].name;

      // Create conversation
      const conversationData = getConversation(coachId, clientId);
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .upsert(conversationData, { onConflict: 'coach_id, client_id' })
        .select()
        .single();

      if (convError || !conversation) {
        console.error('Error creating conversation:', convError);
        continue;
      }

      result.messaging.conversations++;

      // Create participants
      const participantsData = getConversationParticipants(conversation.id, coachId, clientId);
      await supabase
        .from('conversation_participants')
        .upsert(participantsData, { onConflict: 'conversation_id, user_id' });

      // Create messages
      const messagesData = getMessages(conversation.id, coachId, clientId, clientName);
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .insert(messagesData)
        .select();

      if (msgError) {
        console.error('Error creating messages:', msgError);
        continue;
      }

      result.messaging.messages += messages?.length || 0;

      // Create attachments
      const attachmentsData = getMessageAttachments(messages, coachId);
      if (attachmentsData.length > 0) {
        const { data: attachments } = await supabase
          .from('message_attachments')
          .insert(attachmentsData)
          .select();
        result.messaging.attachments += attachments?.length || 0;
      }

      // Create reactions
      const reactionsData = getMessageReactions(messages, coachId, clientId);
      if (reactionsData.length > 0) {
        const { data: reactions } = await supabase
          .from('message_reactions')
          .insert(reactionsData)
          .select();
        result.messaging.reactions += reactions?.length || 0;
      }

      // Create read receipts
      const lastMessage = messages[messages.length - 1];
      const receiptsData = getReadReceipts(conversation.id, coachId, clientId, lastMessage);
      if (receiptsData.length > 0) {
        await supabase
          .from('message_read_receipts')
          .upsert(receiptsData, { onConflict: 'conversation_id, user_id' });
      }

      // Update conversation with last message info
      if (lastMessage) {
        await supabase
          .from('conversations')
          .update({
            last_message_at: lastMessage.sent_at,
            last_message_content: lastMessage.content,
            last_message_sender_id: lastMessage.sender_id,
          })
          .eq('id', conversation.id);
      }
    }

    return result;
  },

  /**
   * Remove seed data for a coach
   */
  removeSeedData: async (coachId: string): Promise<RemoveDataResult> => {
    const supabase = getSupabaseClient();
    const result: RemoveDataResult = {
      deletedClients: 0,
      deletedItems: {
        coachMetrics: 0,
        coachHabits: 0,
        coachFiles: 0,
        coachCheckIns: 0,
        coachQuestionnaires: 0,
        coachExercises: 0,
        coachWorkouts: 0,
        coachPrograms: 0,
        coachSections: 0,
        ownTodos: 0,
        autoTodos: 0,
        conversations: 0,
      },
    };

    // Find test clients by email pattern
    const testEmails = TEST_CLIENTS.map(c => c.email);
    const { data: testClients } = await supabase
      .from('user_profiles')
      .select('id, email')
      .in('email', testEmails);

    const testClientIds = testClients?.map(c => c.id) || [];

    // ==========================================
    // Delete in reverse order of creation
    // ==========================================

    // 1. Delete messages & conversations
    if (testClientIds.length > 0) {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('coach_id', coachId)
        .in('client_id', testClientIds);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);

        // Delete message attachments, reactions, read receipts
        await supabase.from('message_attachments').delete().in('conversation_id', conversationIds);
        await supabase.from('message_reactions').delete().in('conversation_id', conversationIds);
        await supabase.from('message_read_receipts').delete().in('conversation_id', conversationIds);
        await supabase.from('messages').delete().in('conversation_id', conversationIds);
        await supabase.from('conversation_participants').delete().in('conversation_id', conversationIds);

        const { data: deletedConvs } = await supabase
          .from('conversations')
          .delete()
          .in('id', conversationIds)
          .select();
        result.deletedItems.conversations = deletedConvs?.length || 0;
      }
    }

    // 2. Delete todos with TEST prefix
    const { data: deletedOwnTodos } = await supabase
      .from('coach_own_todolist')
      .delete()
      .eq('coach_id', coachId)
      .ilike('title', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.ownTodos = deletedOwnTodos?.length || 0;

    const { data: deletedAutoTodos } = await supabase
      .from('coach_auto_todolist')
      .delete()
      .eq('coach_id', coachId)
      .ilike('title', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.autoTodos = deletedAutoTodos?.length || 0;

    // 3. Delete client data for test clients
    if (testClientIds.length > 0) {
      // Training
      await supabase.from('client_training_exercise_history').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_training_history').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_training').delete().in('client_id', testClientIds);

      // Logs
      await supabase.from('client_photo_logs').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_questionnaire_logs').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_checkin_logs').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_habit_logs').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_metric_logs').delete().eq('coach_id', coachId).in('client_id', testClientIds);

      // Private data
      await supabase.from('client_notes').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_injuries').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_goals').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_bio').delete().eq('coach_id', coachId).in('client_id', testClientIds);

      // Client-specific copies of coach library items (renamed from *_assignments in migration 037)
      await supabase.from('client_questionnaires').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_checkins').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_files').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_habits').delete().eq('coach_id', coachId).in('client_id', testClientIds);
      await supabase.from('client_metrics').delete().eq('coach_id', coachId).in('client_id', testClientIds);

      // Training summary - PK is just client_id, no coach_id column
      await supabase.from('client_training_summary').delete().in('client_id', testClientIds);

      // Coach-client assignments
      await supabase.from('coach_client_assignments').delete().eq('coach_id', coachId).in('client_id', testClientIds);
    }

    // 4. Delete auth users for test clients
    for (const clientId of testClientIds) {
      try {
        await supabase.auth.admin.deleteUser(clientId);
        result.deletedClients++;
      } catch (error) {
        console.error(`Error deleting auth user ${clientId}:`, error);
      }
    }

    // 5. Delete coach library items with TEST prefix
    const { data: deletedMetrics } = await supabase
      .from('coach_metrics')
      .delete()
      .eq('coach_id', coachId)
      .ilike('name', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.coachMetrics = deletedMetrics?.length || 0;

    const { data: deletedHabits } = await supabase
      .from('coach_habits')
      .delete()
      .eq('coach_id', coachId)
      .ilike('name', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.coachHabits = deletedHabits?.length || 0;

    const { data: deletedFiles } = await supabase
      .from('coach_files')
      .delete()
      .eq('coach_id', coachId)
      .ilike('filename', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.coachFiles = deletedFiles?.length || 0;

    const { data: deletedCheckIns } = await supabase
      .from('coach_checkins')
      .delete()
      .eq('coach_id', coachId)
      .ilike('name', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.coachCheckIns = deletedCheckIns?.length || 0;

    const { data: deletedQuestionnaires } = await supabase
      .from('coach_questionnaires')
      .delete()
      .eq('coach_id', coachId)
      .ilike('name', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.coachQuestionnaires = deletedQuestionnaires?.length || 0;

    const { data: deletedExercises } = await supabase
      .from('coach_exercises')
      .delete()
      .eq('coach_id', coachId)
      .ilike('name', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.coachExercises = deletedExercises?.length || 0;

    const { data: deletedWorkouts } = await supabase
      .from('coach_workouts')
      .delete()
      .eq('coach_id', coachId)
      .ilike('name', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.coachWorkouts = deletedWorkouts?.length || 0;

    const { data: deletedPrograms } = await supabase
      .from('coach_programs')
      .delete()
      .eq('coach_id', coachId)
      .ilike('name', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.coachPrograms = deletedPrograms?.length || 0;

    const { data: deletedSections } = await supabase
      .from('coach_sections')
      .delete()
      .eq('coach_id', coachId)
      .ilike('name', `${TEST_PREFIX}%`)
      .select();
    result.deletedItems.coachSections = deletedSections?.length || 0;

    return result;
  },
};
