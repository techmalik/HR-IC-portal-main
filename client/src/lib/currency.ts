export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "ARS", name: "Argentine Peso", symbol: "AR$" },
  { code: "COP", name: "Colombian Peso", symbol: "CO$" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
];

export const DEFAULT_CURRENCY = "USD";

export function normalizeCurrency(currency: string | null | undefined): string {
  if (!currency) return DEFAULT_CURRENCY;
  const upper = currency.toUpperCase();
  return SUPPORTED_CURRENCIES.some((c) => c.code === upper) ? upper : DEFAULT_CURRENCY;
}

export function getCurrencySymbol(currency: string | null | undefined): string {
  const code = normalizeCurrency(currency);
  return SUPPORTED_CURRENCIES.find((c) => c.code === code)?.symbol ?? "$";
}

/**
 * Format a money amount given in minor units (cents) for the given currency.
 * Falls back to USD when the currency is missing or unsupported.
 */
export function formatMoney(
  amountInCents: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amountInCents === null || amountInCents === undefined) return "N/A";
  const code = normalizeCurrency(currency);
  const value = amountInCents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    const symbol = getCurrencySymbol(code);
    return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format a number (already in major units, e.g. dollars) with the currency's symbol.
 */
export function formatMoneyFromAmount(
  amount: number,
  currency: string | null | undefined,
): string {
  return formatMoney(Math.round(amount * 100), currency);
}
