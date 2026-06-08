import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getReceipts } from '../lib/storage';
import { CATEGORY_COLORS } from '../types';
import type { Category } from '../types';

function fmt(n: number) {
  return n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const receipts = getReceipts();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const goBack = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const goNext = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const dailyTotals: Record<string, number> = {};
  receipts.forEach((r) => {
    if (r.date.startsWith(prefix)) dailyTotals[r.date] = (dailyTotals[r.date] ?? 0) + r.total;
  });

  const monthTotal = Object.values(dailyTotals).reduce((s, v) => s + v, 0);
  const selectedReceipts = selected ? receipts.filter((r) => r.date === selected) : [];

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-xl font-bold text-slate-900">カレンダー</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* ナビ */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button onClick={goBack} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="font-bold text-slate-900">{year}年 {month + 1}月</p>
            {monthTotal > 0 && (
              <p className="text-xs text-slate-400 tabular-nums mt-0.5">合計 {fmt(monthTotal)}</p>
            )}
          </div>
          <button onClick={goNext} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 bg-slate-50">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className={`text-center text-[11px] font-bold py-2.5 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'
            }`}>
              {d}
            </div>
          ))}
        </div>

        {/* グリッド */}
        <div className="grid grid-cols-7 border-t border-slate-100">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e${i}`} className="h-[64px] border-b border-r border-slate-100" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const ds = `${prefix}-${String(day).padStart(2, '0')}`;
            const total = dailyTotals[ds];
            const isToday = ds === todayStr;
            const isSel = selected === ds;
            const dow = (firstDay + i) % 7;
            const isLastCol = (firstDay + i) % 7 === 6;

            return (
              <div
                key={day}
                onClick={() => setSelected(isSel ? null : ds)}
                className={`h-[64px] p-2 border-b ${isLastCol ? '' : 'border-r'} border-slate-100 cursor-pointer select-none transition-colors ${
                  isSel ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`text-[11px] font-bold inline-flex w-6 h-6 items-center justify-center rounded-full ${
                  isToday ? 'bg-indigo-600 text-white' :
                  dow === 0 ? 'text-red-400' :
                  dow === 6 ? 'text-blue-400' : 'text-slate-700'
                }`}>
                  {day}
                </span>
                {total !== undefined && (
                  <p className="text-[9px] font-bold text-indigo-500 tabular-nums mt-0.5 leading-tight">
                    {total >= 10000 ? `¥${(total / 10000).toFixed(1)}万` : `¥${total.toLocaleString()}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 選択日の詳細 */}
      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm font-bold text-slate-800 mb-3">
            {parseInt(selected.slice(5, 7))}月{parseInt(selected.slice(8))}日のレシート
          </p>
          {selectedReceipts.length === 0 ? (
            <p className="text-sm text-slate-400">この日のレシートはありません</p>
          ) : (
            <div className="space-y-2">
              {selectedReceipts.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: CATEGORY_COLORS[r.category as Category] ?? '#94a3b8' }}>
                    {r.category.slice(0, 1)}
                  </div>
                  <span className="flex-1 text-sm text-slate-700 truncate">{r.store}</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">{fmt(r.total)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">合計</span>
                <span className="text-base font-bold text-slate-900 tabular-nums">
                  {fmt(selectedReceipts.reduce((s, r) => s + r.total, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
