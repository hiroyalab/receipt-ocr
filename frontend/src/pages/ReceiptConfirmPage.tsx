import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X, Save } from 'lucide-react';
import { createReceipt, updateReceipt, uploadReceiptImage, getAllowedUsers } from '../lib/api';
import { getUsername } from '../lib/auth';
import { CATEGORIES } from '../types';
import type { OcrResult, Receipt, Category, ReceiptItem } from '../types';

function fmt(n: number) {
  return n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}

const h30 = { height: '30px', fontSize: '16px' };
const inputCls = 'w-full px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition';
const inlineCls = 'w-full px-2 bg-transparent border border-transparent rounded-lg text-sm text-slate-800 focus:bg-slate-50 focus:border-slate-200 focus:outline-none transition';

type OcrState = { mode: 'ocr'; result: OcrResult; file: File | null };
type EditState = { mode: 'edit'; receipt: Receipt };

export default function ReceiptConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as OcrState | EditState | null;
  const username = getUsername() ?? '';

  const isEdit = state?.mode === 'edit';
  const ocr = state?.mode === 'ocr' ? state.result : null;
  const receipt = state?.mode === 'edit' ? state.receipt : null;
  const allowedUsers = getAllowedUsers();

  const initialItems: ReceiptItem[] = (receipt?.items ?? ocr?.items ?? []).map((i) => ({
    name: i.name,
    price: i.price,
    quantity: (i as ReceiptItem).quantity ?? 1,
  }));

  const [registrant, setRegistrant] = useState(receipt?.username ?? username);
  const [store, setStore] = useState(receipt?.store ?? ocr?.store ?? '');
  const [date, setDate] = useState(receipt?.date ?? ocr?.date ?? '');
  const [category, setCategory] = useState<Category>((receipt?.category ?? '食費') as Category);
  const [items, setItems] = useState<ReceiptItem[]>(initialItems);
  const [tax, setTax] = useState<number>(receipt?.tax ?? ocr?.tax ?? 0);
  const [saving, setSaving] = useState(false);

  const ocrFile = state?.mode === 'ocr' ? state.file : null;
  const preview = ocrFile
    ? URL.createObjectURL(ocrFile)
    : receipt?.image_url ?? null;

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const total = subtotal + tax;

  if (!state) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        データがありません。<button className="ml-2 text-indigo-600 underline" onClick={() => navigate('/scan')}>レシート登録へ</button>
      </div>
    );
  }

  const updateItem = (i: number, patch: Partial<ReceiptItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    setItems(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const image_url = ocrFile
        ? await uploadReceiptImage(ocrFile)
        : receipt?.image_url;
      const body = { username: registrant, store, date, items, tax, category, image_url };
      if (isEdit) {
        await updateReceipt(receipt!.id, body);
      } else {
        await createReceipt(body);
      }
      navigate('/expenses');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          {isEdit ? 'レシート編集' : 'レシート登録'}
          <span className="text-sm font-normal text-slate-400 ml-2">
            {isEdit ? '内容を編集して保存' : 'OCR結果の編集'}
          </span>
        </h2>
        <button onClick={handleSave} disabled={saving} style={{ height: '36px' }}
          className="flex items-center gap-2 px-5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-md shadow-indigo-200">
          <Save size={14} /> {saving ? '保存中...' : '保存する'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid md:grid-cols-[220px_1fr]">
          {/* 左：プレビュー */}
          <div className="border-b md:border-b-0 md:border-r border-slate-100 p-5 flex flex-col gap-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">プレビュー</p>
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center min-h-[260px]">
              {preview
                ? <img src={preview} alt="receipt" className="w-full h-full object-contain" />
                : <span className="text-xs text-slate-300">画像なし</span>
              }
            </div>
          </div>

          {/* 右：フォーム */}
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label="店舗名">
                <input style={h30} className={inputCls} value={store} onChange={(e) => setStore(e.target.value)} placeholder="店舗名" />
              </Field>
              <Field label="日付">
                <input type="date" style={h30} className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="カテゴリ">
                <select style={h30} className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="登録者">
                <select style={h30} className={inputCls} value={registrant} onChange={(e) => setRegistrant(e.target.value)}>
                  {allowedUsers.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Field>
            </div>

            {/* 商品一覧 */}
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">商品一覧</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                {/* ヘッダー */}
                <div className="grid grid-cols-[1fr_64px_100px_32px] bg-slate-50 px-3 py-2 border-b border-slate-200 gap-2">
                  <span className="text-xs font-bold text-slate-500">商品名</span>
                  <span className="text-xs font-bold text-slate-500 text-center">数量</span>
                  <span className="text-xs font-bold text-slate-500 text-right">単価</span>
                  <span />
                </div>
                {/* 行 */}
                <div className="divide-y divide-slate-100">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_64px_100px_32px] items-center px-3 py-1.5 gap-2">
                      <input style={h30} className={inlineCls} value={item.name} placeholder="商品名"
                        onChange={(e) => updateItem(i, { name: e.target.value })} />
                      <input type="number" style={h30} min={1}
                        className="w-full px-2 bg-transparent border border-transparent rounded-lg text-sm text-center tabular-nums text-slate-800 focus:bg-slate-50 focus:border-slate-200 focus:outline-none transition"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })} />
                      <input type="number" style={h30}
                        className="w-full px-2 bg-transparent border border-transparent rounded-lg text-sm text-right tabular-nums text-slate-800 focus:bg-slate-50 focus:border-slate-200 focus:outline-none transition"
                        value={item.price}
                        onChange={(e) => updateItem(i, { price: Number(e.target.value) })} />
                      <button className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors mx-auto"
                        onClick={() => setItems(items.filter((_, j) => j !== i))}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-slate-300">商品を追加してください</div>
                  )}
                </div>
                {/* フッター */}
                <div className="border-t border-slate-200 bg-slate-50">
                  <div className="grid grid-cols-[1fr_64px_100px_32px] items-center px-3 py-2 gap-2">
                    <span className="text-xs text-slate-500 col-span-2">小計</span>
                    <span className="text-sm tabular-nums text-slate-700 text-right">{fmt(subtotal)}</span>
                    <span />
                  </div>
                  <div className="grid grid-cols-[1fr_64px_100px_32px] items-center px-3 py-1.5 gap-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 col-span-2">消費税</span>
                    <input type="number" style={{ height: '26px', fontSize: '14px' }}
                      className="w-full px-2 bg-white border border-slate-200 rounded-lg text-sm text-right tabular-nums text-slate-800 focus:outline-none focus:border-indigo-400 transition"
                      value={tax}
                      onChange={(e) => setTax(Number(e.target.value))} />
                    <span />
                  </div>
                  <div className="grid grid-cols-[1fr_64px_100px_32px] items-center px-3 py-2 gap-2 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-700 col-span-2">合計（税込）</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums text-right">{fmt(total)}</span>
                    <span />
                  </div>
                </div>
              </div>

              <button onClick={() => setItems([...items, { name: '', price: 0, quantity: 1 }])}
                style={{ height: '40px', fontSize: '16px' }}
                className="mt-2 w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                <Plus size={15} /> 商品を追加
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={handleSave} disabled={saving} style={{ height: '36px' }}
                className="flex items-center gap-2 px-6 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-md shadow-indigo-200">
                <Save size={14} /> {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}
