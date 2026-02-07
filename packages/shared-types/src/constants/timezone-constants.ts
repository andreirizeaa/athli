// ================================================
// Timezone constants for dropdown selectors
// ================================================
// IANA timezone identifiers supported by PostgreSQL / Supabase

export interface TimezoneOption {
  label: string;
  value: string;
}

export interface TimezoneGroup {
  label: string;
  options: TimezoneOption[];
}

// Flat list of all timezones (for simple dropdowns)
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // UTC
  { label: '(UTC+00:00) UTC', value: 'UTC' },

  // Americas - Pacific
  { label: '(UTC-10:00) Hawaii', value: 'Pacific/Honolulu' },
  { label: '(UTC-09:00) Alaska', value: 'America/Anchorage' },
  { label: '(UTC-08:00) Pacific Time (US & Canada)', value: 'America/Los_Angeles' },
  { label: '(UTC-07:00) Mountain Time (US & Canada)', value: 'America/Denver' },
  { label: '(UTC-07:00) Arizona', value: 'America/Phoenix' },
  { label: '(UTC-06:00) Central Time (US & Canada)', value: 'America/Chicago' },
  { label: '(UTC-06:00) Mexico City', value: 'America/Mexico_City' },
  { label: '(UTC-05:00) Eastern Time (US & Canada)', value: 'America/New_York' },
  { label: '(UTC-05:00) Bogota, Lima', value: 'America/Bogota' },
  { label: '(UTC-04:00) Atlantic Time (Canada)', value: 'America/Halifax' },
  { label: '(UTC-04:00) Santiago', value: 'America/Santiago' },
  { label: '(UTC-03:30) Newfoundland', value: 'America/St_Johns' },
  { label: '(UTC-03:00) Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
  { label: '(UTC-03:00) Sao Paulo', value: 'America/Sao_Paulo' },

  // Europe
  { label: '(UTC+00:00) London, Dublin', value: 'Europe/London' },
  { label: '(UTC+01:00) Paris, Berlin, Madrid', value: 'Europe/Paris' },
  { label: '(UTC+01:00) Amsterdam, Brussels', value: 'Europe/Amsterdam' },
  { label: '(UTC+01:00) Rome, Vienna, Zurich', value: 'Europe/Rome' },
  { label: '(UTC+01:00) Stockholm, Oslo', value: 'Europe/Stockholm' },
  { label: '(UTC+01:00) Warsaw', value: 'Europe/Warsaw' },
  { label: '(UTC+02:00) Bucharest', value: 'Europe/Bucharest' },
  { label: '(UTC+02:00) Athens', value: 'Europe/Athens' },
  { label: '(UTC+02:00) Helsinki', value: 'Europe/Helsinki' },
  { label: '(UTC+03:00) Istanbul', value: 'Europe/Istanbul' },
  { label: '(UTC+03:00) Moscow', value: 'Europe/Moscow' },

  // Africa
  { label: '(UTC+01:00) Lagos', value: 'Africa/Lagos' },
  { label: '(UTC+02:00) Cairo', value: 'Africa/Cairo' },
  { label: '(UTC+02:00) Johannesburg', value: 'Africa/Johannesburg' },
  { label: '(UTC+03:00) Nairobi', value: 'Africa/Nairobi' },

  // Middle East
  { label: '(UTC+02:00) Jerusalem', value: 'Asia/Jerusalem' },
  { label: '(UTC+03:00) Riyadh, Kuwait', value: 'Asia/Riyadh' },
  { label: '(UTC+04:00) Dubai, Abu Dhabi', value: 'Asia/Dubai' },

  // Asia
  { label: '(UTC+05:00) Karachi', value: 'Asia/Karachi' },
  { label: '(UTC+05:30) Mumbai, Kolkata', value: 'Asia/Kolkata' },
  { label: '(UTC+06:00) Dhaka', value: 'Asia/Dhaka' },
  { label: '(UTC+07:00) Bangkok, Jakarta', value: 'Asia/Bangkok' },
  { label: '(UTC+08:00) Singapore, Kuala Lumpur', value: 'Asia/Singapore' },
  { label: '(UTC+08:00) Hong Kong', value: 'Asia/Hong_Kong' },
  { label: '(UTC+08:00) Shanghai, Beijing', value: 'Asia/Shanghai' },
  { label: '(UTC+08:00) Taipei', value: 'Asia/Taipei' },
  { label: '(UTC+09:00) Tokyo', value: 'Asia/Tokyo' },
  { label: '(UTC+09:00) Seoul', value: 'Asia/Seoul' },

  // Oceania
  { label: '(UTC+08:00) Perth', value: 'Australia/Perth' },
  { label: '(UTC+09:30) Adelaide', value: 'Australia/Adelaide' },
  { label: '(UTC+10:00) Brisbane', value: 'Australia/Brisbane' },
  { label: '(UTC+10:00) Sydney, Melbourne', value: 'Australia/Sydney' },
  { label: '(UTC+12:00) Auckland', value: 'Pacific/Auckland' },
  { label: '(UTC+12:00) Fiji', value: 'Pacific/Fiji' },
];

// Grouped list (for sectioned dropdowns)
export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    label: 'Americas',
    options: [
      { label: '(UTC-10:00) Hawaii', value: 'Pacific/Honolulu' },
      { label: '(UTC-09:00) Alaska', value: 'America/Anchorage' },
      { label: '(UTC-08:00) Pacific Time (US & Canada)', value: 'America/Los_Angeles' },
      { label: '(UTC-07:00) Mountain Time (US & Canada)', value: 'America/Denver' },
      { label: '(UTC-07:00) Arizona', value: 'America/Phoenix' },
      { label: '(UTC-06:00) Central Time (US & Canada)', value: 'America/Chicago' },
      { label: '(UTC-06:00) Mexico City', value: 'America/Mexico_City' },
      { label: '(UTC-05:00) Eastern Time (US & Canada)', value: 'America/New_York' },
      { label: '(UTC-05:00) Bogota, Lima', value: 'America/Bogota' },
      { label: '(UTC-04:00) Atlantic Time (Canada)', value: 'America/Halifax' },
      { label: '(UTC-04:00) Santiago', value: 'America/Santiago' },
      { label: '(UTC-03:30) Newfoundland', value: 'America/St_Johns' },
      { label: '(UTC-03:00) Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
      { label: '(UTC-03:00) Sao Paulo', value: 'America/Sao_Paulo' },
    ],
  },
  {
    label: 'Europe',
    options: [
      { label: '(UTC+00:00) London, Dublin', value: 'Europe/London' },
      { label: '(UTC+01:00) Paris, Berlin, Madrid', value: 'Europe/Paris' },
      { label: '(UTC+01:00) Amsterdam, Brussels', value: 'Europe/Amsterdam' },
      { label: '(UTC+01:00) Rome, Vienna, Zurich', value: 'Europe/Rome' },
      { label: '(UTC+01:00) Stockholm, Oslo', value: 'Europe/Stockholm' },
      { label: '(UTC+01:00) Warsaw', value: 'Europe/Warsaw' },
      { label: '(UTC+02:00) Bucharest', value: 'Europe/Bucharest' },
      { label: '(UTC+02:00) Athens', value: 'Europe/Athens' },
      { label: '(UTC+02:00) Helsinki', value: 'Europe/Helsinki' },
      { label: '(UTC+03:00) Istanbul', value: 'Europe/Istanbul' },
      { label: '(UTC+03:00) Moscow', value: 'Europe/Moscow' },
    ],
  },
  {
    label: 'Africa',
    options: [
      { label: '(UTC+01:00) Lagos', value: 'Africa/Lagos' },
      { label: '(UTC+02:00) Cairo', value: 'Africa/Cairo' },
      { label: '(UTC+02:00) Johannesburg', value: 'Africa/Johannesburg' },
      { label: '(UTC+03:00) Nairobi', value: 'Africa/Nairobi' },
    ],
  },
  {
    label: 'Middle East',
    options: [
      { label: '(UTC+02:00) Jerusalem', value: 'Asia/Jerusalem' },
      { label: '(UTC+03:00) Riyadh, Kuwait', value: 'Asia/Riyadh' },
      { label: '(UTC+04:00) Dubai, Abu Dhabi', value: 'Asia/Dubai' },
    ],
  },
  {
    label: 'Asia',
    options: [
      { label: '(UTC+05:00) Karachi', value: 'Asia/Karachi' },
      { label: '(UTC+05:30) Mumbai, Kolkata', value: 'Asia/Kolkata' },
      { label: '(UTC+06:00) Dhaka', value: 'Asia/Dhaka' },
      { label: '(UTC+07:00) Bangkok, Jakarta', value: 'Asia/Bangkok' },
      { label: '(UTC+08:00) Singapore, Kuala Lumpur', value: 'Asia/Singapore' },
      { label: '(UTC+08:00) Hong Kong', value: 'Asia/Hong_Kong' },
      { label: '(UTC+08:00) Shanghai, Beijing', value: 'Asia/Shanghai' },
      { label: '(UTC+08:00) Taipei', value: 'Asia/Taipei' },
      { label: '(UTC+09:00) Tokyo', value: 'Asia/Tokyo' },
      { label: '(UTC+09:00) Seoul', value: 'Asia/Seoul' },
    ],
  },
  {
    label: 'Oceania',
    options: [
      { label: '(UTC+08:00) Perth', value: 'Australia/Perth' },
      { label: '(UTC+09:30) Adelaide', value: 'Australia/Adelaide' },
      { label: '(UTC+10:00) Brisbane', value: 'Australia/Brisbane' },
      { label: '(UTC+10:00) Sydney, Melbourne', value: 'Australia/Sydney' },
      { label: '(UTC+12:00) Auckland', value: 'Pacific/Auckland' },
      { label: '(UTC+12:00) Fiji', value: 'Pacific/Fiji' },
    ],
  },
  {
    label: 'Other',
    options: [
      { label: '(UTC+00:00) UTC', value: 'UTC' },
    ],
  },
];

// All valid timezone values (for validation)
export const TIMEZONE_VALUES = TIMEZONE_OPTIONS.map((tz) => tz.value);

export type Timezone = (typeof TIMEZONE_VALUES)[number];
