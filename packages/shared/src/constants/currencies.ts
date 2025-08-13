// ============================================================================
// CURRENCY CONSTANTS
// ============================================================================

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  isActive: boolean;
}

export const CURRENCIES: Record<string, Currency> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    isActive: true
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    symbolPosition: 'before',
    decimalPlaces: 0,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: "'",
    decimalSeparator: '.',
    isActive: true
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  BRL: {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    isActive: true
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: '$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  KRW: {
    code: 'KRW',
    name: 'South Korean Won',
    symbol: '₩',
    symbolPosition: 'before',
    decimalPlaces: 0,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  HKD: {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    isActive: true
  },
  SEK: {
    code: 'SEK',
    name: 'Swedish Krona',
    symbol: 'kr',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    isActive: true
  },
  NOK: {
    code: 'NOK',
    name: 'Norwegian Krone',
    symbol: 'kr',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    isActive: true
  },
  DKK: {
    code: 'DKK',
    name: 'Danish Krone',
    symbol: 'kr',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    isActive: true
  },
  PLN: {
    code: 'PLN',
    name: 'Polish Złoty',
    symbol: 'zł',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    isActive: true
  },
  CZK: {
    code: 'CZK',
    name: 'Czech Koruna',
    symbol: 'Kč',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    isActive: true
  },
  HUF: {
    code: 'HUF',
    name: 'Hungarian Forint',
    symbol: 'Ft',
    symbolPosition: 'after',
    decimalPlaces: 0,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    isActive: true
  },
  RUB: {
    code: 'RUB',
    name: 'Russian Ruble',
    symbol: '₽',
    symbolPosition: 'after',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: ',',
    isActive: true
  },
  TRY: {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
    isActive: true
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    symbolPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
    decimalSeparator: '.',
    isActive: true
  }
};

export const ACTIVE_CURRENCIES = Object.values(CURRENCIES).filter(currency => currency.isActive);

export const DEFAULT_CURRENCY = 'USD';

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES[code.toUpperCase()];
};

export const formatCurrencyAmount = (
  amount: number,
  currencyCode: string,
  locale: string = 'en-US'
): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) {
    return amount.toString();
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces
  });

  return formatter.format(amount);
};

export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  return currency?.symbol || currencyCode;
};

export const isSupportedCurrency = (currencyCode: string): boolean => {
  return currencyCode.toUpperCase() in CURRENCIES;
};
