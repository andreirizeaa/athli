import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../src/lib/supabase'

const PENDING_KEY = 'pendingLiftCompletions'
const PENDING_FAIL_KEY = 'pendingLiftFailures'
export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK'

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  try {
    if (error || !data) return
    const payload = data as any
    // Handle success notifications (existing flow)
    if (payload.type === 'lift_complete' && payload.assetId) {
      const { data: lift } = await supabase
        .from('lifts')
        .select('id,user_id,is_favourite,lift_type,lift_date,lift_time,metric_weight,reps,thumbnail_url,analysis,asset_id')
        .eq('asset_id', payload.assetId)
        .maybeSingle()
      if (lift) {
        const raw = (await AsyncStorage.getItem(PENDING_KEY)) || '[]'
        const list = JSON.parse(raw)
        list.push({ assetId: payload.assetId, lift, savedAt: Date.now() })
        await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list))
      }
      return
    }

    // Handle failure notifications (new)
    if (payload.type === 'lift_failed' && payload.assetId) {
      const raw = (await AsyncStorage.getItem(PENDING_FAIL_KEY)) || '[]'
      const list = JSON.parse(raw)
      list.push({
        assetId: payload.assetId,
        error: payload.error || null,
        stage: payload.stage || 'analyze',
        savedAt: Date.now(),
      })
      await AsyncStorage.setItem(PENDING_FAIL_KEY, JSON.stringify(list))
      return
    }
  } catch (_) {
    // no-op; background tasks must be resilient
  }
})


