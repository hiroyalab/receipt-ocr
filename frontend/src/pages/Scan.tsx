import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { ocrReceipt } from '../lib/api';
import { saveReceipt } from '../lib/storage';
import { getUsername } from '../lib/auth';
import { CATEGORIES } from '../types';
import type { OcrResult, Category } from '../types';

function formatCurrency(n: number) {
  return n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}

type Step = 'upload' | 'loading' | 'confirm' | 'done' | 'error';

export default function Scan() {
  const [step, setStep] = useState<Step>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<Category>('食費');
  const [editItems, setEditItems] = useState<OcrResult['items']>([]);
  const [editStore, setEditStore] = useState('');
  const [editDate, setEditDate] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const username = getUsername() ?? '';

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      setStep('error');
      return;
    }
    setPreview(URL.createObjectURL(file));
    setStep('loading');
    try {
      const res = await ocrReceipt(file, username);
      setResult(res);
      setEditItems(res.items);
      setEditStore(res.store);
      setEditDate(res.date);
      setStep('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCRに失敗しました');
      setStep('error');
    }
  }, [username]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onSave = () => {
    if (!result) return;
    const total = editItems.reduce((s, i) => s + i.price, 0);
    saveReceipt({
      id: crypto.randomUUID(),
      store: editStore,
      date: editDate,
      items: editItems,
      total,
      category,
      username,
      createdAt: new Date().toISOString(),
    });
    setStep('done');
  };

  const reset = () => {
    setStep('upload');
    setPreview(null);
    setResult(null);
    setError('');
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <CheckCircle size={48} className="text-green-500" />
        <p className="text-lg font-semibold text-slate-700">保存しました！</p>
        <div className="flex gap-3">
          <button onClick={reset} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50">続けて読み取る</button>
          <button onClick={() => navigate('/expenses')} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">支出一覧へ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-800">レシート読み取り</h2>

      {/* アップロードエリア */}
      {(step === 'upload' || step === 'error') && (
        <div
          className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-10 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload size={40} className="mx-auto text-slate-400 mb-3" />
          <p className="font-medium text-slate-600">レシート画像をドロップ</p>
          <p className="text-sm text-slate-400 mt-1">またはクリックして選択</p>
          {step === 'error' && (
            <p className="mt-3 text-sm text-red-500 flex items-center justify-center gap-1">
              <AlertCircle size={14} /> {error}
            </p>
          )}
        </div>
      )}

      {/* ローディング */}
      {step === 'loading' && (
        <div className="bg-white rounded-xl p-10 flex flex-col items-center gap-4">
          {preview && <img src={preview} alt="レシート" className="max-h-48 object-contain rounded" />}
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-slate-600">OCR処理中...</p>
        </div>
      )}

      {/* 確認・編集 */}
      {step === 'confirm' && result && (
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex gap-3 items-start">
            {preview && (
              <img src={preview} alt="レシート" className="w-24 h-32 object-cover rounded shrink-0" />
            )}
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-slate-500">店舗名</label>
                <input
                  className="w-full mt-0.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={editStore}
                  onChange={(e) => setEditStore(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">日付</label>
                <input
                  type="date"
                  className="w-full mt-0.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">カテゴリ</label>
                <select
                  className="w-full mt-0.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 商品一覧 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">商品一覧</p>
              <button
                className="text-xs text-indigo-600 hover:underline"
                onClick={() => setEditItems([...editItems, { name: '', price: 0 }])}
              >
                + 追加
              </button>
            </div>
            <ul className="space-y-2">
              {editItems.map((item, i) => (
                <li key={i} className="flex gap-2 items-center">
                  <input
                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm"
                    value={item.name}
                    placeholder="商品名"
                    onChange={(e) => {
                      const arr = [...editItems];
                      arr[i] = { ...arr[i], name: e.target.value };
                      setEditItems(arr);
                    }}
                  />
                  <input
                    type="number"
                    className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm text-right"
                    value={item.price}
                    onChange={(e) => {
                      const arr = [...editItems];
                      arr[i] = { ...arr[i], price: Number(e.target.value) };
                      setEditItems(arr);
                    }}
                  />
                  <button onClick={() => setEditItems(editItems.filter((_, j) => j !== i))}>
                    <X size={14} className="text-slate-400 hover:text-red-500" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 合計 */}
          <div className="flex justify-between items-center font-semibold text-slate-800 border-t pt-3">
            <span>合計</span>
            <span>{formatCurrency(editItems.reduce((s, i) => s + i.price, 0))}</span>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">やり直す</button>
            <button onClick={onSave} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">保存する</button>
          </div>
        </div>
      )}
    </div>
  );
}
