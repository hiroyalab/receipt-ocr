import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ChevronDown, ChevronUp, PackageOpen, Pencil, Check } from 'lucide-react';
import { getReceipts, deleteReceipt } from '../lib/api';
import { CATEGORIES, CATEGORY_COLORS } from '../types';
import type { Receipt, Category } from '../types';

function fmt(n: number) {
  return n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}

export default function Expenses() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('すべて');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getReceipts().then(setReceipts).catch(console.error);
  }, []);

  const filtered = receipts.filter((r) => {
    const matchCat = filterCategory === 'すべて' || r.category === filterCategory;
    const matchQ = !search || r.store.includes(search) || r.items.some((i) => i.name.includes(search));
    return matchCat && matchQ;
  });

  const total = filtered.reduce((s, r) => s + r.total, 0);

  const handleDelete = async (id: string) => {
    if (!confirm('このレシートを削除しますか？')) return;
    await deleteReceipt(id);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">支出管理</h2>
        <div className="text-sm text-slate-500">
          <span className="font-bold text-slate-900 tabular-nums">{fmt(total)}</span>
          <span className="ml-1 text-slate-400">/ {filtered.length}件</span>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            style={{ height: '36px', fontSize: '16px' }}
            className="w-full pl-3 pr-3 bg-slate-50 rounded-xl text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition"
            placeholder="店舗名・商品名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <CategorySelect value={filterCategory} onChange={setFilterCategory} />
      </div>

      {/* リスト */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-16 flex flex-col items-center gap-2">
          <PackageOpen size={32} className="text-slate-300" />
          <p className="text-sm text-slate-400">レシートがありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {filtered.map((r) => {
            const color = CATEGORY_COLORS[r.category as Category] ?? '#94a3b8';
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id}>
                <div className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold"
                    style={{ background: color }}>
                    {r.category.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.store}</p>
                      <span className="text-[11px] font-semibold shrink-0 hidden sm:inline" style={{ color }}>
                        {r.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{r.date}</p>
                  </div>
                  <p className="font-bold text-slate-900 tabular-nums text-sm shrink-0 mr-2">{fmt(r.total)}</p>
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors shrink-0"
                    onClick={() => navigate('/receipt/confirm', { state: { mode: 'edit', receipt: r } })}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
                    onClick={() => handleDelete(r.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 pt-3 bg-slate-50 border-t border-slate-100">
                    <table className="w-full">
                      <tbody>
                        {r.items.map((item, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0">
                            <td className="py-1.5 text-sm text-slate-600">{item.name}</td>
                            <td className="py-1.5 text-sm font-medium text-slate-800 tabular-nums text-right">{fmt(item.price)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="pt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">合計</td>
                          <td className="pt-3 text-sm font-bold text-slate-900 tabular-nums text-right">{fmt(r.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = ['すべて', ...CATEGORIES];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative sm:w-44">
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ height: '36px' }}
        className="w-full flex items-center justify-between px-3 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-white transition"
      >
        <span className={value === 'すべて' ? 'text-slate-400' : 'text-slate-800 font-medium'}>{value}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-full sm:w-44 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{ minHeight: '48px' }}
              className="w-full flex items-center justify-between px-4 text-base hover:bg-slate-50 transition-colors"
            >
              <span className={opt === value ? 'text-indigo-600 font-semibold' : 'text-slate-700'}>{opt}</span>
              {opt === value && <Check size={15} className="text-indigo-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
