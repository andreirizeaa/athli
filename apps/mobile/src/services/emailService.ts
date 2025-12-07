import * as MailComposer from 'expo-mail-composer';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { showAlert } from './alertService';
import { getUserId } from './storageService';

export interface EmailOptions {
  recipients: string[];
  subject: string;
  body: string;
}

const supportEmail = 'support@useformai.com';

export async function openEmailComposer(options: EmailOptions): Promise<void> {
  try {
    const isAvailable = await MailComposer.isAvailableAsync();

    if (!isAvailable) {
      showAlert('Email Not Available', 'No email app is available on this device.');
      return;
    }

    await MailComposer.composeAsync(options);
  } catch (error) {
    console.error('Error opening email composer:', error);
    showAlert(
      'Error',
      'Failed to open email composer. Please try again.',
      undefined,
      'EMAIL_SERVICE_FAILED_TO_OPEN_COMPOSER',
      error
    );
  }
}

export async function openSupportEmail(): Promise<void> {
  const userId = await getUserId();

  const options: EmailOptions = {
    recipients: [supportEmail],
    subject: 'FormAI Support Request',
    body: `Hello FormAI Support Team,



        

              Meta data (Please do not remove this as it will help us identify your account)

              - Platform: ${Platform.OS}
              - Device Version: ${Platform.Version}
              - App Version: ${Constants.expoConfig?.version}
              - User ID: ${userId}
          `,
  };

  await openEmailComposer(options);
}

export async function openMetricsFeedbackEmail(): Promise<void> {
  const userId = await getUserId();

  const options: EmailOptions = {
    recipients: [supportEmail],
    subject: 'Performance Metrics Feedback',
    body: `Hello FormAI Support Team,

I'd like to suggest the following metrics for the Performance screen:




              Meta data (Please do not remove this as it will help us identify your account)

              - Platform: ${Platform.OS}
              - Device Version: ${Platform.Version}
              - App Version: ${Constants.expoConfig?.version}
              - User ID: ${userId}
          `,
  };

  await openEmailComposer(options);
}

export async function openCancellationEmail(): Promise<void> {
  const userId = await getUserId();

  const options: EmailOptions = {
    recipients: [supportEmail],
    subject: 'FormAI Subscription Cancellation Feedback',
    body: `Hello FormAI Support Team,

I recently cancelled my subscription and wanted to provide feedback:




              Meta data (Please do not remove this as it will help us identify your account)

              - Platform: ${Platform.OS}
              - Device Version: ${Platform.Version}
              - App Version: ${Constants.expoConfig?.version}
              - User ID: ${userId}
          `,
  };

  await openEmailComposer(options);
}

export async function openDeletionFeedbackEmail(): Promise<void> {
  const userId = await getUserId();

  const metadata = userId
    ? `

              Meta data (Please do not remove this as it will help us identify your account)

              - Platform: ${Platform.OS}
              - Device Version: ${Platform.Version}
              - App Version: ${Constants.expoConfig?.version}
              - User ID: ${userId}
          `
    : '';

  const options: EmailOptions = {
    recipients: [supportEmail],
    subject: 'Form AI App Deletion Feedback',
    body: `Hey Form AI,

I'm considering deleting the app and wanted to share my feedback:




${metadata}`,
  };

  await openEmailComposer(options);
}
