// ============================================================================
// COUNTRIES CONSTANTS
// ============================================================================

export interface Country {
  code: string;
  name: string;
  phoneCode: string;
  currency: string;
  timezone: string;
  isActive: boolean;
}

export const COUNTRIES: Record<string, Country> = {
  US: {
    code: 'US',
    name: 'United States',
    phoneCode: '+1',
    currency: 'USD',
    timezone: 'America/New_York',
    isActive: true
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    phoneCode: '+1',
    currency: 'CAD',
    timezone: 'America/Toronto',
    isActive: true
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    phoneCode: '+44',
    currency: 'GBP',
    timezone: 'Europe/London',
    isActive: true
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    phoneCode: '+49',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    isActive: true
  },
  FR: {
    code: 'FR',
    name: 'France',
    phoneCode: '+33',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    isActive: true
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    phoneCode: '+61',
    currency: 'AUD',
    timezone: 'Australia/Sydney',
    isActive: true
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    phoneCode: '+81',
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    isActive: true
  },
  CN: {
    code: 'CN',
    name: 'China',
    phoneCode: '+86',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
    isActive: true
  },
  IN: {
    code: 'IN',
    name: 'India',
    phoneCode: '+91',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    isActive: true
  },
  BR: {
    code: 'BR',
    name: 'Brazil',
    phoneCode: '+55',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    isActive: true
  }
};

export const ACTIVE_COUNTRIES = Object.values(COUNTRIES).filter(country => country.isActive);

export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES[code.toUpperCase()];
};

export const getCountryByPhoneCode = (phoneCode: string): Country | undefined => {
  return Object.values(COUNTRIES).find(country => country.phoneCode === phoneCode);
};

export const isSupportedCountry = (countryCode: string): boolean => {
  return countryCode.toUpperCase() in COUNTRIES;
};
