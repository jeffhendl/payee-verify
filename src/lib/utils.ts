import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CURRENCY_CONFIG, type PaymentRail, type Currency } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string): string {
  const config = CURRENCY_CONFIG[currency as Currency];
  if (!config) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amount);
  return config.prefix ? config.prefix + formatted : formatted;
}

export function inferPaymentRail(fields: {
  aba_routing_number?: string | null;
  transit_number?: string | null;
  institution_number?: string | null;
  swift_code?: string | null;
  iban?: string | null;
  sort_code?: string | null;
}): PaymentRail | null {
  if (fields.iban) return 'sepa';
  if (fields.sort_code && !fields.aba_routing_number) return 'bacs';
  if (fields.swift_code) return 'swift';
  if (fields.aba_routing_number) return 'ach';
  if (fields.transit_number && fields.institution_number) return 'eft';
  return null;
}

export function hasBankingDetails(payee: {
  payment_rail?: string | null;
  aba_routing_number?: string | null;
  account_number?: string | null;
  transit_number?: string | null;
  institution_number?: string | null;
  swift_code?: string | null;
  iban?: string | null;
  sort_code?: string | null;
}): boolean {
  const rail = payee.payment_rail || inferPaymentRail(payee);
  switch (rail) {
    case 'ach': return !!(payee.aba_routing_number && payee.account_number);
    case 'eft': return !!(payee.transit_number && payee.institution_number && payee.account_number);
    case 'swift': return !!(payee.swift_code && payee.account_number);
    case 'sepa': return !!payee.iban;
    case 'bacs': return !!(payee.sort_code && payee.account_number);
    default: return !!(payee.iban || payee.swift_code || payee.aba_routing_number || (payee.transit_number && payee.institution_number));
  }
}
