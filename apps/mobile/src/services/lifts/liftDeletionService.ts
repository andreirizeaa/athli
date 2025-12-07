import { deleteLiftCardData } from './liftService';
import { hapticFeedback } from '../../utils/haptic';

/**
 * Simple lift deletion method that handles both loading and final lifts
 * Returns true if successful, false otherwise
 */
export async function deleteLift(liftId: string, lift: any): Promise<boolean> {
  hapticFeedback.selection();
  try {
    const assetId = typeof lift?.assetId === 'string' ? lift.assetId : undefined;
    const ok = await deleteLiftCardData(liftId, { assetId });
    if (ok) {
      hapticFeedback.success();
      return true;
    }
    hapticFeedback.error();
    return false;
  } catch (error) {
    hapticFeedback.error();
    return false;
  }
}
