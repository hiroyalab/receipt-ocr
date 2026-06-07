export interface ReceiptItem {
  name: string;
  price: number;
}

export interface Receipt {
  id: string;
  username: string;
  store: string;
  date: string;
  items: ReceiptItem[];
  total: number;
  category: string;
  createdAt: string;
}

export interface OcrResult {
  success: boolean;
  store: string;
  date: string;
  items: ReceiptItem[];
  total: number;
  raw_lines: string[];
}

export type Category =
  | '食費'
  | '外食'
  | '日用品'
  | '交通費'
  | '医療費'
  | '娯楽'
  | '衣類'
  | 'その他';

export const CATEGORIES: Category[] = [
  '食費', '外食', '日用品', '交通費', '医療費', '娯楽', '衣類', 'その他',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  '食費': '#6366f1',
  '外食': '#f59e0b',
  '日用品': '#10b981',
  '交通費': '#3b82f6',
  '医療費': '#ef4444',
  '娯楽': '#ec4899',
  '衣類': '#8b5cf6',
  'その他': '#94a3b8',
};
