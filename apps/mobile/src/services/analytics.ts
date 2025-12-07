// Analytics service - simplified (no-op implementation)
// All tracking functions are no-ops to maintain compatibility

export async function initAnalytics() {
  // No-op
}

export function track(event: string, props: Record<string, any> = {}) {
  // No-op
}

export function identify(userId: string) {
  // No-op
}

export function setUserProperties(properties: Record<string, any>) {
  // No-op
}

export function flush() {
  // No-op
}
