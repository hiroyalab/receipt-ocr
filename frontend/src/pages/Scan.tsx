import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, CheckCircle2, AlertCircle, X, Plus, Camera } from 'lucide-react';
import { ocrReceipt } from '../lib/api';
import { saveReceipt } from '../lib/storage';
import { getUsername } from '../lib/auth';
import { CATEGORIES } from '../types';
import type { OcrResult, Category } from '../types';

function fmt(n: number) {
  return n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}

type Step = 'upload' | 'loading' | 'confirm' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  upload: 'アップロード', loading: 'アップロード', error: 'アップロード',
  confirm: '確認・編集', done: '保存完了',
};
const STEP_ORDER: Step[] = ['upload', 'confirm', 'done'];

function Stepper({ current }: { current: Step }) {
  const idx = current === 'loading' || current === 'error' ? 0 : STEP_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-1.5">
      {STEP_ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              i < idx ? 'bg-indigo-600 text-white' :
              i === idx ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
              'bg-slate-200 text-slate-400'
            }`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i <= idx ? 'text-slate-700' : 'text-slate-400'}`}>
              {STEP_LABELS[s]}
            </span>
          </div>
          {i < STEP_ORDER.length - 1 && (
            <div className={`w-6 h-px ${i < idx ? 'bg-indigo-300' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

const field = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition placeholder-slate-400';

export default function Scan() {
  const [step, setStep] = useState<Step>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<Category>('食費');
  const [editItems, setEditItems] = useState<OcrResult['items']>([]);
  const [editStore, setEditStore] = useState('');
  const [editDate, setEditDate] = useState('');
  const [dragging, setDragging] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const username = getUsername() ?? '';

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('画像ファイルを選択してください'); setStep('error'); return; }
    setPreview(URL.createObjectURL(file));
    setStep('loading');
    try {
      const res = await ocrReceipt(file, username);
      setResult(res); setEditItems(res.items); setEditStore(res.store); setEditDate(res.date);
      setStep('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCRに失敗しました');
      setStep('error');
    }
  }, [username]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onSave = () => {
    if (!result) return;
    const total = editItems.reduce((s, i) => s + i.price, 0);
    saveReceipt({ id: crypto.randomUUID(), store: editStore, date: editDate, items: editItems, total, category, username, createdAt: new Date().toISOString() });
    setStep('done');
  };

  const reset = () => { setStep('upload'); setPreview(null); setResult(null); setError(''); };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">レシート読み取り</h2>
        <Stepper current={step} />
      </div>

      {/* アップロード */}
      {(step === 'upload' || step === 'error') && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`bg-white rounded-2xl shadow-sm border-2 border-dashed p-16 text-center cursor-pointer transition-all ${
            dragging ? 'border-indigo-400 bg-indigo-50/30' :
            step === 'error' ? 'border-red-200 hover:border-red-300' :
            'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Camera size={28} className="text-indigo-500" />
          </div>
          <p className="font-semibold text-slate-700 text-[15px]">レシートをアップロード</p>
          <p className="text-sm text-slate-400 mt-1.5">ドラッグ&ドロップ、またはクリックして選択</p>
          <p className="text-xs text-slate-300 mt-3">JPEG · PNG · HEIC · WebP</p>
          {step === 'error' && (
            <div className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 rounded-xl text-sm text-red-500 font-medium">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>
      )}

      {/* ローディング */}
      {step === 'loading' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center gap-5">
          {preview && <img src={preview} alt="" className="max-h-44 object-contain rounded-xl border border-slate-200" />}
          <div className="text-center space-y-2">
            <Loader2 size={28} className="animate-spin text-indigo-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">OCR処理中...</p>
            <p className="text-xs text-slate-400">レシートのテキストを解析しています</p>
          </div>
        </div>
      )}

      {/* 確認・編集 */}
      {step === 'confirm' && result && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 space-y-4">
            <div className="flex gap-4">
              {preview && (
                <img src={preview} alt="" className="w-20 h-28 object-cover rounded-xl shrink-0 border border-slate-200" />
              )}
              <div className="flex-1 space-y-3">
                <Field label="店舗名">
                  <input className={field} value={editStore} onChange={(e) => setEditStore(e.target.value)} placeholder="店舗名" />
                </Field>
                <Field label="日付">
                  <input type="date" className={field} value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </Field>
                <Field label="カテゴリ">
                  <select className={field} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-800">商品一覧</p>
              <button
                onClick={() => setEditItems([...editItems, { name: '', price: 0 }])}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
              >
                <Plus size={12} /> 追加
              </button>
            </div>
            <div className="space-y-2">
              {editItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                    value={item.name} placeholder="商品名"
                    onChange={(e) => { const a = [...editItems]; a[i] = { ...a[i], name: e.target.value }; setEditItems(a); }}
                  />
                  <input
                    type="number"
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right tabular-nums focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                    value={item.price}
                    onChange={(e) => { const a = [...editItems]; a[i] = { ...a[i], price: Number(e.target.value) }; setEditItems(a); }}
                  />
                  <button className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors"
                    onClick={() => setEditItems(editItems.filter((_, j) => j !== i))}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 px-5 py-4 border-t border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-slate-600">合計</span>
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                {fmt(editItems.reduce((s, i) => s + i.price, 0))}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                やり直す
              </button>
              <button onClick={onSave} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-200">
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完了 */}
      {step === 'done' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-14 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">保存しました</p>
            <p className="text-sm text-slate-400 mt-1">レシートが登録されました</p>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              続けて読み取る
            </button>
            <button onClick={() => navigate('/expenses')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-200">
              支出一覧へ
            </button>
          </div>
        </div>
      )}
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
