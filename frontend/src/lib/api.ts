import type { OcrResult, Receipt, ReceiptItem, Category } from '../types';
import { supabase } from './supabase';

export interface ReceiptCreate {
  username: string;
  store: string;
  date: string;
  items: ReceiptItem[];
  tax: number;
  category: Category;
  image_base64?: string;
}

export async function ocrReceipt(file: File): Promise<OcrResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/ocr', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'OCR処理に失敗しました' }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function getReceipts(): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error('レシート一覧の取得に失敗しました');
  return data ?? [];
}

export async function createReceipt(body: ReceiptCreate): Promise<Receipt> {
  const subtotal = body.items.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
  const total = subtotal + (body.tax || 0);
  const { data, error } = await supabase
    .from('receipts')
    .insert({ ...body, total })
    .select()
    .single();

  if (error) throw new Error('レシートの保存に失敗しました');
  return data;
}

export async function updateReceipt(id: string, body: ReceiptCreate): Promise<Receipt> {
  const subtotal = body.items.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
  const total = subtotal + (body.tax || 0);
  const { data, error } = await supabase
    .from('receipts')
    .update({ ...body, total })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('レシートの更新に失敗しました');
  return data;
}

export async function deleteReceipt(id: string): Promise<void> {
  const { error } = await supabase.from('receipts').delete().eq('id', id);
  if (error) throw new Error('レシートの削除に失敗しました');
}

// 後方互換のため残す（LoginPage で使用）
export async function login(
  username: string,
): Promise<{ user: { user_id: string; username: string }; token: string }> {
  const ALLOWED = ['しほ', 'ひろや'];
  if (!ALLOWED.includes(username)) throw new Error('ログインに失敗しました');
  return { user: { user_id: username, username }, token: 'local' };
}
