import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { getReceipts, deleteReceipt } from '../lib/storage';
import { CATEGORIES, CATEGORY_COLORS } from '../types';
import type { Category } from '../types';

function formatCurrency(n: number) {
  return n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}

export default function Expenses() {
  const [receipts, setReceipts] = useState(getReceipts);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('すべて');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = receipts.filter((r) => {
    const matchCat = filterCategory === 'すべて' || r.category === filterCategory;
    const matchSearch = r.store.includes(search) || r.items.some((i) => i.name.includes(search));
    return matchCat && matchSearch;
  });

  const total = filtered.reduce((s, r) => s + r.total, 0);

  const handleDelete = (id: string) => {
    if (!confirm('削除しますか？')) return;
    deleteReceipt(id);
    setReceipts(getReceipts());
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">支出管理</h2>
        <span className="text-sm text-slate-500">{filtered.length}件 / 合計 {formatCurrency(total)}</span>
      </div>

      {/* フィルター */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            placeholder="店舗名・商品名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option>すべて</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* リスト */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-400 text-sm">
          レシートがありません
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: CATEGORY_COLORS[r.category as Category] ?? '#94a3b8' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{r.store}</p>
                  <p className="text-xs text-slate-400">{r.date} · {r.category}</p>
                </div>
                <span className="font-semibold text-slate-700 shrink-0">{formatCurrency(r.total)}</span>
                <button
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  {expandedId === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button className="text-slate-400 hover:text-red-500 shrink-0" onClick={() => handleDelete(r.id)}>
                  <Trash2 size={15} />
                </button>
              </div>

              {expandedId === r.id && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                  <ul className="space-y-1">
                    {r.items.map((item, i) => (
                      <li key={i} className="flex justify-between text-sm text-slate-600">
                        <span>{item.name}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
