import type { Receipt } from '../types';

/** 基準残高（2026年11月時点） */
export const BASE_BALANCE = 634023;
/** 基準月。この月の1日以降のレシートを残高から差し引く */
export const BASE_YEAR = 2026;
export const BASE_MONTH = 11; // 1-12
/** 月初に入金する人数（毎月の入金額 × この人数を加算） */
export const CONTRIBUTORS = 2;

export const MONTHLY_DEPOSIT_KEY = 'monthly_deposit';

export function getMonthlyDeposit(): number {
  const v = Number(localStorage.getItem(MONTHLY_DEPOSIT_KEY) ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

const pad = (n: number) => String(n).padStart(2, '0');
const BASE_DATE = `${BASE_YEAR}-${pad(BASE_MONTH)}-01`;

/**
 * 基準月の翌月から今月までに迎えた月初の回数。
 * 基準月の入金は基準残高に含まれている前提。
 */
export function depositCount(now: Date = new Date()): number {
  const months = (now.getFullYear() - BASE_YEAR) * 12 + (now.getMonth() + 1 - BASE_MONTH);
  return Math.max(0, months);
}

export interface BalanceSummary {
  base: number;
  deposits: number;
  spent: number;
  balance: number;
}

export function calcBalance(receipts: Receipt[], monthlyDeposit: number, now: Date = new Date()): BalanceSummary {
  const deposits = depositCount(now) * monthlyDeposit * CONTRIBUTORS;
  const spent = receipts
    .filter((r) => r.date >= BASE_DATE)
    .reduce((s, r) => s + r.total, 0);
  return { base: BASE_BALANCE, deposits, spent, balance: BASE_BALANCE + deposits - spent };
}
