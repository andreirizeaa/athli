import { Mixpanel } from 'mixpanel-react-native';

let mixpanel: Mixpanel | null = null;

export async function initAnalytics() {
  try {
    const projectToken = process.env.EXPO_PUBLIC_MIXPANEL_PROJECT_TOKEN!;

    if (!projectToken) {
      return;
    }
    const trackAutomaticEvents = false;
    mixpanel = new Mixpanel(projectToken, trackAutomaticEvents);
    await mixpanel.init();
    mixpanel.setServerURL('https://api-eu.mixpanel.com');
  } catch (error) {}
}

export function track(event: string, props: Record<string, any> = {}) {
  try {
    if (mixpanel) {
      mixpanel.track(event, {
        ...props,
        platform: require('react-native').Platform.OS,
        timestamp: new Date().toISOString(),
      });
    }
    mixpanel?.flush();
  } catch (error) {}
}

export function identify(userId: string) {
  try {
    if (mixpanel) {
      mixpanel.identify(userId);
      mixpanel.alias(userId, userId); // Links anonymous history to this user
    }
  } catch (error) {}
}

export function setUserProperties(properties: Record<string, any>) {
  try {
    if (mixpanel) {
      mixpanel.getPeople().set(properties);
    }
  } catch (error) {}
}

export function flush() {
  try {
    if (mixpanel) {
      mixpanel.flush();
    }
  } catch (error) {}
}
