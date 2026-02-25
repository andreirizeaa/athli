import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { PressableOpacity } from 'pressto';
import {
  Check,
  Loader2,
  Dumbbell,
  Calendar,
  LayoutList,
  Target,
  AlertTriangle,
  MessageSquare,
  User,
  ClipboardList,
  BarChart3,
} from 'lucide-react-native';
import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';

// ── Types ──────────────────────────────────────────────────────────

export type ActionType =
  | 'create_workout'
  | 'create_program'
  | 'create_section'
  | 'assign_workout'
  | 'assign_metric_to_client'
  | 'add_client_goal'
  | 'add_client_injury'
  | 'draft_message'
  | 'update_client_profile'
  | 'create_checkin_template'
  | 'create_metric';

export function getActionDisplayName(actionType: ActionType, payload?: any): string {
  const hasClient = !!payload?.clientId;
  switch (actionType) {
    case 'create_workout':
      return hasClient ? 'Add to Training' : 'Add to Library';
    case 'create_program':
      return 'Add Program';
    case 'create_section':
      return 'Add Section';
    case 'assign_workout':
      return 'Assign Workout';
    case 'assign_metric_to_client':
      return 'Assign Metric';
    case 'add_client_goal':
      return 'Add Goal';
    case 'add_client_injury':
      return 'Record Injury';
    case 'draft_message':
      return 'Send Message';
    case 'update_client_profile':
      return 'Update Profile';
    case 'create_checkin_template':
      return hasClient ? 'Create Check-in' : 'Add Check-in';
    case 'create_metric':
      return hasClient ? 'Track Metric' : 'Add Metric';
    default:
      return 'Confirm';
  }
}

function getActionIcon(actionType: ActionType) {
  switch (actionType) {
    case 'create_workout': return Dumbbell;
    case 'create_program': return Calendar;
    case 'create_section': return LayoutList;
    case 'assign_workout': return Calendar;
    case 'assign_metric_to_client': return BarChart3;
    case 'add_client_goal': return Target;
    case 'add_client_injury': return AlertTriangle;
    case 'draft_message': return MessageSquare;
    case 'update_client_profile': return User;
    case 'create_checkin_template': return ClipboardList;
    case 'create_metric': return BarChart3;
    default: return Dumbbell;
  }
}

// ── Exercise Preview ───────────────────────────────────────────────

function getLetterLabel(index: number): string {
  let label = '';
  let num = index;
  do {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);
  return label;
}

function ExercisePreviewList({ sections, themeColors }: { sections: any[]; themeColors: any }) {
  const items: { label: string; name: string }[] = [];
  let letterIndex = 0;

  sections.forEach((section: any) => {
    const isSuperset = section.type === 'superset';
    (section.exercises || []).forEach((exercise: any, exIdx: number) => {
      if (isSuperset) {
        items.push({ label: `${getLetterLabel(letterIndex)}${exIdx + 1}`, name: exercise.name });
      } else {
        items.push({ label: getLetterLabel(letterIndex), name: exercise.name });
        if (exIdx < (section.exercises?.length ?? 0) - 1) letterIndex++;
      }
    });
    letterIndex++;
  });

  if (items.length === 0) return null;

  return (
    <View style={{ marginTop: 8 }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
          <View style={{
            height: 20, width: 20, borderRadius: 10,
            backgroundColor: themeColors.primary,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{item.label}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '500', color: themeColors.text }} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Action Summary ─────────────────────────────────────────────────

function ActionSummary({ actionType, payload, themeColors }: { actionType: ActionType; payload: any; themeColors: any }) {
  const tagStyle = {
    backgroundColor: themeColors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  };
  const tagText = { fontSize: 11, color: themeColors.primary };

  if (actionType === 'create_workout') {
    const sections = payload.sections || [];
    const exerciseCount = sections.reduce((sum: number, s: any) => sum + (s.exercises?.length || 0), 0);
    return (
      <View style={{ gap: 4 }}>
        <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>{payload.name}</Text>
        {payload.description ? (
          <Text style={{ fontSize: 13, color: themeColors.mutedText }} numberOfLines={2}>{payload.description}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          <View style={tagStyle}><Text style={tagText}>{exerciseCount} exercises</Text></View>
          <View style={tagStyle}><Text style={tagText}>{sections.length} sections</Text></View>
          {payload.difficulty && <View style={tagStyle}><Text style={tagText}>{payload.difficulty}</Text></View>}
        </View>
        {sections.length > 0 && <ExercisePreviewList sections={sections} themeColors={themeColors} />}
      </View>
    );
  }

  if (actionType === 'create_section') {
    const exerciseCount = payload.exercises?.length || 0;
    return (
      <View style={{ gap: 4 }}>
        <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>{payload.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          <View style={tagStyle}><Text style={tagText}>{exerciseCount} exercises</Text></View>
          {payload.type && <View style={tagStyle}><Text style={tagText}>{payload.type}</Text></View>}
        </View>
        {payload.exercises?.length > 0 && (
          <ExercisePreviewList
            sections={[{ name: payload.name, type: payload.type, exercises: payload.exercises }]}
            themeColors={themeColors}
          />
        )}
      </View>
    );
  }

  if (actionType === 'assign_workout') {
    return (
      <View style={{ gap: 4 }}>
        <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>
          Assign "{payload.workoutName}" to {payload.clientName}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <View style={tagStyle}>
            <Text style={tagText}>
              {new Date(payload.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (actionType === 'assign_metric_to_client') {
    return (
      <View style={{ gap: 4 }}>
        <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>
          Assign "{payload.metricName}" to {payload.clientName}
        </Text>
      </View>
    );
  }

  if (actionType === 'add_client_goal') {
    return (
      <View style={{ gap: 4 }}>
        <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>
          Add goal for {payload.clientName}
        </Text>
        <Text style={{ fontSize: 13, color: themeColors.mutedText }}>{payload.goalType}</Text>
      </View>
    );
  }

  if (actionType === 'add_client_injury') {
    return (
      <View style={{ gap: 4 }}>
        <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>
          Record injury for {payload.clientName}
        </Text>
        <Text style={{ fontSize: 13, color: themeColors.mutedText }}>
          {payload.injuryType} - {payload.bodyPart}
        </Text>
      </View>
    );
  }

  if (actionType === 'draft_message') {
    return (
      <View style={{ gap: 4 }}>
        <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>
          Message for {payload.clientName}
        </Text>
        <Text style={{ fontSize: 13, color: themeColors.mutedText }} numberOfLines={3}>{payload.message}</Text>
      </View>
    );
  }

  if (actionType === 'create_checkin_template') {
    const qCount = payload.questions?.length || 0;
    return (
      <View style={{ gap: 4 }}>
        <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>{payload.name}</Text>
        {payload.description ? (
          <Text style={{ fontSize: 13, color: themeColors.mutedText }} numberOfLines={2}>{payload.description}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <View style={tagStyle}><Text style={tagText}>{qCount} question{qCount !== 1 ? 's' : ''}</Text></View>
        </View>
      </View>
    );
  }

  if (actionType === 'create_metric') {
    return (
      <View style={{ gap: 4 }}>
        <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>{payload.name}</Text>
        {payload.description ? (
          <Text style={{ fontSize: 13, color: themeColors.mutedText }} numberOfLines={2}>{payload.description}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          {payload.unit && <View style={tagStyle}><Text style={tagText}>Unit: {payload.unit}</Text></View>}
        </View>
      </View>
    );
  }

  // Default
  return (
    <View style={{ gap: 4 }}>
      <Text style={[typography.p2, { fontWeight: '600', color: themeColors.text }]}>
        {payload.name || 'Action'}
      </Text>
    </View>
  );
}

// ── Action Card ────────────────────────────────────────────────────

interface ActionCardProps {
  actionType: ActionType;
  payload: any;
  onConfirm: (modifiedPayload?: any) => Promise<void>;
  initialConfirmed?: boolean;
}

export function ActionCard({ actionType, payload, onConfirm, initialConfirmed }: ActionCardProps) {
  const { colors: themeColors } = useThemePreference();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(initialConfirmed ?? false);

  const handleConfirm = useCallback(async () => {
    if (isConfirming || isConfirmed) return;
    setIsConfirming(true);
    try {
      await onConfirm();
      setIsConfirmed(true);
    } catch (err) {
      console.error('[ActionCard] confirm failed:', err);
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, isConfirmed, onConfirm]);

  const Icon = getActionIcon(actionType);
  const buttonLabel = getActionDisplayName(actionType, payload);

  return (
    <View style={[styles.card, { backgroundColor: themeColors.primary + '0A', borderColor: themeColors.primary + '30' }]}>
      <View style={styles.cardContent}>
        <View style={[styles.iconBox, { backgroundColor: themeColors.primary + '18' }]}>
          <Icon size={20} color={themeColors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ActionSummary actionType={actionType} payload={payload} themeColors={themeColors} />
        </View>
      </View>
      <View style={styles.cardFooter}>
        <PressableOpacity
          onPress={handleConfirm}
          disabled={isConfirming || isConfirmed}
          style={[
            styles.confirmButton,
            { backgroundColor: isConfirmed ? '#16a34a' : themeColors.primary },
            (isConfirming || isConfirmed) && { opacity: 0.8 },
          ]}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isConfirmed ? (
            <>
              <Check size={16} color="#fff" />
              <Text style={styles.confirmText}>Done</Text>
            </>
          ) : (
            <Text style={styles.confirmText}>{buttonLabel}</Text>
          )}
        </PressableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
