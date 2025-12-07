import { Alert } from 'react-native';
import { track } from './analytics';
import { hapticFeedback } from '../utils/haptic';

export function showAlert(
  title: string,
  message?: string,
  onPress?: () => void,
  errorId?: string,
  errorDetails?: any,
  buttonText?: string
): void {
  // Track error if errorId is provided
  if (errorId) {
    track('Errors', {
      type: errorId,
      details: errorDetails ? JSON.stringify(errorDetails) : undefined,
    });
  }
  hapticFeedback.error();
  Alert.alert(title, message, [{ text: buttonText || 'OK', onPress }]);
}
