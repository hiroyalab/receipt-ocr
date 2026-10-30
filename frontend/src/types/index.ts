export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export interface Receipt {
  id: string;
  username: string;
  store: string;
  date: string;
  items: ReceiptItem[];
  tax: number;
  total: number;
  category: string;
  created_at: string;
  image_url?: string;
}

export interface OcrResult {
  success: boolean;
  store: string;
  date: string;
  items: ReceiptItem[];
  tax: number;
  total: number;
  raw_lines: string[];
}

export type OcrJobStatus = 'pending' | 'processing' | 'done' | 'error';

export interface OcrJob {
  id: string;
  username: string;
  image_path: string;
  image_url: string;
  status: OcrJobStatus;
  result: OcrResult | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export type Category =
  | '食費'
  | '外食'
  | '日用品'
  | '交通費'
  | '医療費'
  | '娯楽'
  | '衣類'
  | '光熱費・水道代'
  | 'その他';

export const CATEGORIES: Category[] = [
  '食費', '外食', '日用品', '交通費', '医療費', '娯楽', '衣類', '光熱費・水道代', 'その他',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  '食費': '#6366f1',
  '外食': '#f59e0b',
  '日用品': '#10b981',
  '交通費': '#3b82f6',
  '医療費': '#ef4444',
  '娯楽': '#ec4899',
  '衣類': '#8b5cf6',
  '光熱費・水道代': '#06b6d4',
  'その他': '#94a3b8',
};
