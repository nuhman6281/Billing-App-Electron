// ============================================================================
// FINANCIAL CALCULATION UTILITIES
// ============================================================================

/**
 * Rounds a number to a specified number of decimal places
 */
export const roundToDecimals = (value: number, decimals: number = 2): number => {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
};

/**
 * Calculates simple interest
 */
export const calculateSimpleInterest = (principal: number, rate: number, time: number): number => {
  return roundToDecimals((principal * rate * time) / 100);
};

/**
 * Calculates compound interest
 */
export const calculateCompoundInterest = (
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 1
): number => {
  const rateDecimal = rate / 100;
  const amount = principal * Math.pow(1 + rateDecimal / compoundingFrequency, compoundingFrequency * time);
  return roundToDecimals(amount - principal);
};

/**
 * Calculates future value with compound interest
 */
export const calculateFutureValue = (
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 1
): number => {
  const rateDecimal = rate / 100;
  return roundToDecimals(principal * Math.pow(1 + rateDecimal / compoundingFrequency, compoundingFrequency * time));
};

/**
 * Calculates present value
 */
export const calculatePresentValue = (
  futureValue: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 1
): number => {
  const rateDecimal = rate / 100;
  return roundToDecimals(futureValue / Math.pow(1 + rateDecimal / compoundingFrequency, compoundingFrequency * time));
};

/**
 * Calculates loan payment (PMT function)
 */
export const calculateLoanPayment = (
  principal: number,
  rate: number,
  term: number,
  paymentsPerYear: number = 12
): number => {
  const ratePerPeriod = (rate / 100) / paymentsPerYear;
  const totalPayments = term * paymentsPerYear;
  
  if (ratePerPeriod === 0) {
    return roundToDecimals(principal / totalPayments);
  }
  
  const payment = principal * (ratePerPeriod * Math.pow(1 + ratePerPeriod, totalPayments)) / 
                 (Math.pow(1 + ratePerPeriod, totalPayments) - 1);
  
  return roundToDecimals(payment);
};

/**
 * Calculates loan balance after N payments
 */
export const calculateLoanBalance = (
  principal: number,
  rate: number,
  term: number,
  paymentsMade: number,
  paymentsPerYear: number = 12
): number => {
  const ratePerPeriod = (rate / 100) / paymentsPerYear;
  const totalPayments = term * paymentsPerYear;
  
  if (ratePerPeriod === 0) {
    const payment = principal / totalPayments;
    return roundToDecimals(principal - (payment * paymentsMade));
  }
  
  const payment = (principal * ratePerPeriod * Math.pow(1 + ratePerPeriod, totalPayments)) / 
                 (Math.pow(1 + ratePerPeriod, totalPayments) - 1);
  
  const balance = principal * Math.pow(1 + ratePerPeriod, paymentsMade) - 
                 payment * ((Math.pow(1 + ratePerPeriod, paymentsMade) - 1) / ratePerPeriod);
  
  return roundToDecimals(Math.max(0, balance));
};

// ============================================================================
// DEPRECIATION CALCULATIONS
// ============================================================================

/**
 * Calculates straight-line depreciation
 */
export const calculateStraightLineDepreciation = (
  cost: number,
  salvageValue: number,
  usefulLife: number
): number => {
  return roundToDecimals((cost - salvageValue) / usefulLife);
};

/**
 * Calculates declining balance depreciation
 */
export const calculateDecliningBalanceDepreciation = (
  cost: number,
  _salvageValue: number,
  usefulLife: number,
  rate: number = 2 // Double declining balance
): number => {
  const depreciationRate = (rate / usefulLife) / 100;
  return roundToDecimals(cost * depreciationRate);
};

/**
 * Calculates units of production depreciation
 */
export const calculateUnitsOfProductionDepreciation = (
  cost: number,
  salvageValue: number,
  totalUnits: number,
  unitsThisPeriod: number
): number => {
  const depreciationPerUnit = (cost - salvageValue) / totalUnits;
  return roundToDecimals(depreciationPerUnit * unitsThisPeriod);
};

/**
 * Calculates sum-of-years digits depreciation
 */
export const calculateSumOfYearsDigitsDepreciation = (
  cost: number,
  salvageValue: number,
  usefulLife: number,
  year: number
): number => {
  const sumOfYears = (usefulLife * (usefulLife + 1)) / 2;
  const remainingLife = usefulLife - year + 1;
  return roundToDecimals(((cost - salvageValue) * remainingLife) / sumOfYears);
};

// ============================================================================
// FINANCIAL RATIOS
// ============================================================================

/**
 * Calculates current ratio
 */
export const calculateCurrentRatio = (currentAssets: number, currentLiabilities: number): number => {
  if (currentLiabilities === 0) return 0;
  return roundToDecimals(currentAssets / currentLiabilities, 2);
};

/**
 * Calculates quick ratio (acid-test ratio)
 */
export const calculateQuickRatio = (
  currentAssets: number,
  inventory: number,
  currentLiabilities: number
): number => {
  if (currentLiabilities === 0) return 0;
  return roundToDecimals((currentAssets - inventory) / currentLiabilities, 2);
};

/**
 * Calculates debt-to-equity ratio
 */
export const calculateDebtToEquityRatio = (totalLiabilities: number, totalEquity: number): number => {
  if (totalEquity === 0) return 0;
  return roundToDecimals(totalLiabilities / totalEquity, 2);
};

/**
 * Calculates debt ratio
 */
export const calculateDebtRatio = (totalLiabilities: number, totalAssets: number): number => {
  if (totalAssets === 0) return 0;
  return roundToDecimals(totalLiabilities / totalAssets, 2);
};

/**
 * Calculates equity ratio
 */
export const calculateEquityRatio = (totalEquity: number, totalAssets: number): number => {
  if (totalAssets === 0) return 0;
  return roundToDecimals(totalEquity / totalAssets, 2);
};

/**
 * Calculates gross profit margin
 */
export const calculateGrossProfitMargin = (grossProfit: number, revenue: number): number => {
  if (revenue === 0) return 0;
  return roundToDecimals((grossProfit / revenue) * 100, 2);
};

/**
 * Calculates net profit margin
 */
export const calculateNetProfitMargin = (netIncome: number, revenue: number): number => {
  if (revenue === 0) return 0;
  return roundToDecimals((netIncome / revenue) * 100, 2);
};

/**
 * Calculates return on assets (ROA)
 */
export const calculateROA = (netIncome: number, totalAssets: number): number => {
  if (totalAssets === 0) return 0;
  return roundToDecimals((netIncome / totalAssets) * 100, 2);
};

/**
 * Calculates return on equity (ROE)
 */
export const calculateROE = (netIncome: number, totalEquity: number): number => {
  if (totalEquity === 0) return 0;
  return roundToDecimals((netIncome / totalEquity) * 100, 2);
};

/**
 * Calculates asset turnover ratio
 */
export const calculateAssetTurnover = (revenue: number, totalAssets: number): number => {
  if (totalAssets === 0) return 0;
  return roundToDecimals(revenue / totalAssets, 2);
};

/**
 * Calculates inventory turnover ratio
 */
export const calculateInventoryTurnover = (costOfGoodsSold: number, averageInventory: number): number => {
  if (averageInventory === 0) return 0;
  return roundToDecimals(costOfGoodsSold / averageInventory, 2);
};

// ============================================================================
// TAX CALCULATIONS
// ============================================================================

/**
 * Calculates tax amount
 */
export const calculateTaxAmount = (taxableAmount: number, taxRate: number): number => {
  return roundToDecimals(taxableAmount * (taxRate / 100));
};

/**
 * Calculates tax-inclusive amount
 */
export const calculateTaxInclusiveAmount = (taxExclusiveAmount: number, taxRate: number): number => {
  return roundToDecimals(taxExclusiveAmount * (1 + taxRate / 100));
};

/**
 * Calculates tax-exclusive amount
 */
export const calculateTaxExclusiveAmount = (taxInclusiveAmount: number, taxRate: number): number => {
  return roundToDecimals(taxInclusiveAmount / (1 + taxRate / 100));
};

/**
 * Calculates compound tax
 */
export const calculateCompoundTax = (amount: number, taxRates: number[]): number => {
  let totalTax = 0;
  let remainingAmount = amount;
  
  for (const rate of taxRates) {
    const taxAmount = calculateTaxAmount(remainingAmount, rate);
    totalTax += taxAmount;
    remainingAmount += taxAmount; // Add tax to amount for next calculation
  }
  
  return roundToDecimals(totalTax);
};

// ============================================================================
// CURRENCY CONVERSION
// ============================================================================

/**
 * Converts amount from one currency to another
 */
export const convertCurrency = (
  amount: number,
  _fromCurrency: string,
  _toCurrency: string,
  exchangeRate: number
): number => {
  if (_fromCurrency === _toCurrency) return amount;
  return roundToDecimals(amount * exchangeRate);
};

/**
 * Calculates exchange rate from two amounts
 */
export const calculateExchangeRate = (
  fromAmount: number,
  toAmount: number,
  _fromCurrency: string,
  _toCurrency: string
): number => {
  if (fromAmount === 0) return 0;
  return roundToDecimals(toAmount / fromAmount, 4);
};

// ============================================================================
// TIME VALUE OF MONEY
// ============================================================================

/**
 * Calculates net present value (NPV)
 */
export const calculateNPV = (
  cashFlows: number[],
  discountRate: number,
  initialInvestment: number = 0
): number => {
  let npv = -initialInvestment;
  
  for (let i = 0; i < cashFlows.length; i++) {
    const cashFlow = cashFlows[i];
    if (cashFlow !== undefined) {
      const discountFactor = Math.pow(1 + discountRate / 100, i + 1);
      npv += cashFlow / discountFactor;
    }
  }
  
  return roundToDecimals(npv);
};

/**
 * Calculates internal rate of return (IRR)
 * Uses Newton-Raphson method for approximation
 */
export const calculateIRR = (
  cashFlows: number[],
  initialGuess: number = 0.1,
  maxIterations: number = 100,
  tolerance: number = 0.0001
): number => {
  let guess = initialGuess;
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, guess * 100);
    const derivative = calculateNPVDerivative(cashFlows, guess * 100);
    
    if (Math.abs(derivative) < tolerance) break;
    
    const newGuess = guess - npv / derivative;
    if (Math.abs(newGuess - guess) < tolerance) break;
    
    guess = newGuess;
  }
  
  return roundToDecimals(guess * 100, 2);
};

/**
 * Helper function for IRR calculation
 */
const calculateNPVDerivative = (cashFlows: number[], discountRate: number): number => {
  let derivative = 0;
  
  for (let i = 0; i < cashFlows.length; i++) {
    const cashFlow = cashFlows[i];
    if (cashFlow !== undefined) {
      const discountFactor = Math.pow(1 + discountRate / 100, i + 1);
      derivative -= (i + 1) * cashFlow / (discountFactor * (1 + discountRate / 100));
    }
  }
  
  return derivative;
};

// ============================================================================
// PAYMENT CALCULATIONS
// ============================================================================

/**
 * Calculates payment allocation using snowball method
 */
export const calculateSnowballPaymentAllocation = (
  debts: Array<{ id: string; balance: number; minimumPayment: number; interestRate: number }>,
  totalPayment: number
): Array<{ debtId: string; payment: number; remainingBalance: number }> => {
  const sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);
  const allocations: Array<{ debtId: string; payment: number; remainingBalance: number }> = [];
  let remainingPayment = totalPayment;
  
  for (const debt of sortedDebts) {
    if (remainingPayment <= 0) break;
    
    const payment = Math.min(remainingPayment, debt.balance);
    const remainingBalance = debt.balance - payment;
    
    allocations.push({
      debtId: debt.id,
      payment,
      remainingBalance
    });
    
    remainingPayment -= payment;
  }
  
  return allocations;
};

/**
 * Calculates payment allocation using avalanche method
 */
export const calculateAvalanchePaymentAllocation = (
  debts: Array<{ id: string; balance: number; minimumPayment: number; interestRate: number }>,
  totalPayment: number
): Array<{ debtId: string; payment: number; remainingBalance: number }> => {
  const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate);
  const allocations: Array<{ debtId: string; payment: number; remainingBalance: number }> = [];
  let remainingPayment = totalPayment;
  
  for (const debt of sortedDebts) {
    if (remainingPayment <= 0) break;
    
    const payment = Math.min(remainingPayment, debt.balance);
    const remainingBalance = debt.balance - payment;
    
    allocations.push({
      debtId: debt.id,
      payment,
      remainingBalance
    });
    
    remainingPayment -= payment;
  }
  
  return allocations;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats a number as currency
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Formats a number as percentage
 */
export const formatPercentage = (
  value: number,
  decimals: number = 2,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Formats a number with thousands separators
 */
export const formatNumber = (
  value: number,
  decimals: number = 2,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};
