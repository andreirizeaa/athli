import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import { eventBus, AppEvents } from './lifts/event-bus';
import { openLiftById, navigateToFailedLiftDate } from './navigationService';
import { navigationRef } from './navigationService';
import { openCancellationEmail } from './emailService';

declare global {
  var pendingLiftId: string | undefined;
  var pendingFailedLiftNavigation: { assetId: string; liftId?: string } | undefined;
}

export async function handleLiftNotificationData(raw: any) {
  const type = typeof raw?.type === 'string' ? raw.type : undefined;
  const action = typeof raw?.action === 'string' ? raw.action : undefined;
  const liftId = raw?.liftId ? String(raw.liftId) : undefined;
  const assetId = raw?.assetId ? String(raw.assetId) : undefined;

  // Handle custom subscription notification actions first
  if (action === 'open_store_review') {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      }
    } catch (error) {
      console.warn('Error opening store review:', error);
    }
    return;
  }

  if (action === 'open_cancellation_email') {
    try {
      await openCancellationEmail();
    } catch (error) {
      console.warn('Error opening cancellation email:', error);
    }
    return;
  }

  // Handle lift ready notifications
  if (type === 'lift_ready' && liftId) {
    // Emit event for any UI components that need to know
    eventBus.emit(AppEvents.LiftReady, { liftId });

    // Always set the pending lift ID for reliable navigation
    global.pendingLiftId = liftId;

    // Attempt immediate navigation if ready, otherwise it will be handled when navigation becomes ready
    if (navigationRef.isReady()) {
      // Add a small delay to ensure all contexts are loaded
      setTimeout(() => {
        if (global.pendingLiftId) {
          openLiftById(global.pendingLiftId);
          global.pendingLiftId = undefined;
        }
      }, 500);
    }
    return;
  }

  // Handle lift failed notifications
  if (type === 'lift_failed') {
    eventBus.emit(AppEvents.LiftFailed, {
      error: typeof raw?.error === 'string' ? raw.error : undefined,
      liftId: liftId,
      assetId: assetId,
    });

    if (assetId) {
      // Queue the failed lift navigation
      global.pendingFailedLiftNavigation = { assetId, liftId };

      const goToFailedDate = () => {
        if (global.pendingFailedLiftNavigation) {
          const { assetId: pendingAssetId, liftId: pendingLiftId } =
            global.pendingFailedLiftNavigation;
          navigateToFailedLiftDate(pendingAssetId, pendingLiftId);
          global.pendingFailedLiftNavigation = undefined;
        }
      };

      if (navigationRef.isReady()) {
        goToFailedDate();
      } else {
        // Wait for navigation to be ready
        eventBus.once(AppEvents.NavReady, goToFailedDate);
      }
    }
    return;
  }
}

/** Handle cold start notification if any */
export async function handleColdStartNotificationIfAny() {
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last) {
      await handleLiftNotificationData(last.notification.request.content.data as any);
    }
  } catch (error) {
    console.warn('Error handling cold start notification:', error);
  }
}
