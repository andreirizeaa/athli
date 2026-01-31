/**
 * Seed Data Utilities
 * Helper functions for generating test data
 */

/**
 * Test client definitions with shared names for testing search functionality
 */
export const TEST_CLIENTS = [
  {
    email: 'test.client.1@athli.dev',
    name: '[TEST] Sarah Johnson',
    gender: 'female',
    dateOfBirth: '1992-05-15',
    heightCm: 165,
    country: 'United States',
    unitSystem: 'imperial',
    category: 'online',
    status: 'connected'
  },
  {
    email: 'test.client.2@athli.dev',
    name: '[TEST] Michael Williams',
    gender: 'male',
    dateOfBirth: '1988-11-22',
    heightCm: 178,
    country: 'Canada',
    unitSystem: 'metric',
    category: 'in-person',
    status: 'connected'
  },
  {
    email: 'test.client.3@athli.dev',
    name: '[TEST] Emma Williams',
    gender: 'female',
    dateOfBirth: '1995-03-08',
    heightCm: 170,
    country: 'United Kingdom',
    unitSystem: 'metric',
    category: 'hybrid',
    status: 'connected'
  },
  {
    email: 'test.client.4@athli.dev',
    name: '[TEST] Sarah Chen',
    gender: 'female',
    dateOfBirth: '1990-07-30',
    heightCm: 168,
    country: 'Australia',
    unitSystem: 'metric',
    category: 'online',
    status: 'connected'
  },
  {
    email: 'test.client.5@athli.dev',
    name: '[TEST] James Rodriguez',
    gender: 'male',
    dateOfBirth: '1997-12-03',
    heightCm: 180,
    country: 'United States',
    unitSystem: 'imperial',
    category: 'online',
    status: 'invited'
  }
] as const;

export type TestClient = typeof TEST_CLIENTS[number];

/**
 * Generate a random date within the past N days
 */
export function randomDateInPast(daysAgo: number): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return pastDate;
}

/**
 * Generate a date string in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate dates for the past N days
 */
export function getPastDates(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(formatDate(date));
  }
  return dates;
}

/**
 * Generate a random number within a range
 */
export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float within a range with specified decimal places
 */
export function randomFloatInRange(min: number, max: number, decimals: number = 1): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

/**
 * Pick a random item from an array
 */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pick N random items from an array
 */
export function randomPickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

/**
 * Generate a UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Test data prefix - used to identify and clean up test data
 */
export const TEST_PREFIX = '[TEST]';

/**
 * Test email domain - used to identify test clients
 */
export const TEST_EMAIL_DOMAIN = '@athli.dev';

/**
 * Check if a name is test data
 */
export function isTestData(name: string): boolean {
  return name.startsWith(TEST_PREFIX);
}

/**
 * Check if an email is a test email
 */
export function isTestEmail(email: string): boolean {
  return email.endsWith(TEST_EMAIL_DOMAIN);
}

/**
 * Default password for test accounts
 */
export const TEST_PASSWORD = 'TestPassword123!';
