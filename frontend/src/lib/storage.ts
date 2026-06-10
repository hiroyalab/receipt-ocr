import type { Receipt } from '../types';

const STORAGE_KEY = 'receipts';

export function getReceipts(): Receipt[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveReceipt(receipt: Receipt): void {
  const receipts = getReceipts();
  const idx = receipts.findIndex((r) => r.id === receipt.id);
  if (idx >= 0) {
    receipts[idx] = receipt;
  } else {
    receipts.unshift(receipt);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
}

export function deleteReceipt(id: string): void {
  const updated = getReceipts().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
