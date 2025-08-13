// ============================================================================
// TIMEZONES CONSTANTS
// ============================================================================

export interface Timezone {
  name: string;
  offset: string;
  offsetMinutes: number;
  isActive: boolean;
}

export const TIMEZONES: Record<string, Timezone> = {
  'UTC': {
    name: 'UTC',
    offset: '+00:00',
    offsetMinutes: 0,
    isActive: true
  },
  'America/New_York': {
    name: 'Eastern Time',
    offset: '-05:00',
    offsetMinutes: -300,
    isActive: true
  },
  'America/Chicago': {
    name: 'Central Time',
    offset: '-06:00',
    offsetMinutes: -360,
    isActive: true
  },
  'America/Denver': {
    name: 'Mountain Time',
    offset: '-07:00',
    offsetMinutes: -420,
    isActive: true
  },
  'America/Los_Angeles': {
    name: 'Pacific Time',
    offset: '-08:00',
    offsetMinutes: -480,
    isActive: true
  },
  'America/Toronto': {
    name: 'Eastern Time (Canada)',
    offset: '-05:00',
    offsetMinutes: -300,
    isActive: true
  },
  'Europe/London': {
    name: 'Greenwich Mean Time',
    offset: '+00:00',
    offsetMinutes: 0,
    isActive: true
  },
  'Europe/Paris': {
    name: 'Central European Time',
    offset: '+01:00',
    offsetMinutes: 60,
    isActive: true
  },
  'Europe/Berlin': {
    name: 'Central European Time',
    offset: '+01:00',
    offsetMinutes: 60,
    isActive: true
  },
  'Asia/Tokyo': {
    name: 'Japan Standard Time',
    offset: '+09:00',
    offsetMinutes: 540,
    isActive: true
  },
  'Asia/Shanghai': {
    name: 'China Standard Time',
    offset: '+08:00',
    offsetMinutes: 480,
    isActive: true
  },
  'Asia/Kolkata': {
    name: 'India Standard Time',
    offset: '+05:30',
    offsetMinutes: 330,
    isActive: true
  },
  'Australia/Sydney': {
    name: 'Australian Eastern Time',
    offset: '+10:00',
    offsetMinutes: 600,
    isActive: true
  }
};

export const ACTIVE_TIMEZONES = Object.values(TIMEZONES).filter(tz => tz.isActive);

export const getTimezoneByName = (name: string): Timezone | undefined => {
  return TIMEZONES[name];
};

export const getTimezoneByOffset = (offset: string): Timezone | undefined => {
  return Object.values(TIMEZONES).find(tz => tz.offset === offset);
};

export const isSupportedTimezone = (timezoneName: string): boolean => {
  return timezoneName in TIMEZONES;
};

export const getCurrentTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};

export const formatTimezoneOffset = (offsetMinutes: number): string => {
  const hours = Math.abs(Math.floor(offsetMinutes / 60));
  const minutes = Math.abs(offsetMinutes % 60);
  const sign = offsetMinutes <= 0 ? '+' : '-';
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};
