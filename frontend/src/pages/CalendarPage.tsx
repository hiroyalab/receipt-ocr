import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getReceipts } from '../lib/storage';
import { CATEGORY_COLORS } from '../types';
import type { Category } from '../types';

function formatCurrency(n: number) {
  return n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const receipts = getReceipts();

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 日別合計
  const dailyTotals: Record<string, number> = {};
  receipts.forEach((r) => {
    if (r.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
      dailyTotals[r.date] = (dailyTotals[r.date] ?? 0) + r.total;
    }
  });

  const selectedReceipts = selectedDate
    ? receipts.filter((r) => r.date === selectedDate)
    : [];

  const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-800">カレンダー</h2>

      <div className="bg-white rounded-xl shadow-sm p-5">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft size={18} /></button>
          <span className="font-semibold text-slate-800">{year}年 {month + 1}月</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight size={18} /></button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-500'}`}>{d}</div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-lg overflow-hidden">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white h-16" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const total = dailyTotals[dateStr];
            const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const dayOfWeek = (firstDay + i) % 7;

            return (
              <div
                key={day}
                className={`bg-white h-16 p-1 cursor-pointer hover:bg-indigo-50 transition-colors ${isSelected ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              >
                <span className={`text-xs font-medium inline-flex w-5 h-5 items-center justify-center rounded-full
                  ${isToday ? 'bg-indigo-600 text-white' : dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-slate-700'}`}>
                  {day}
                </span>
                {total !== undefined && (
                  <p className="text-[10px] text-indigo-600 font-medium mt-0.5 leading-tight">
                    ¥{total.toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 選択日のレシート */}
      {selectedDate && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-3">{selectedDate}のレシート</h3>
          {selectedReceipts.length === 0 ? (
            <p className="text-sm text-slate-400">この日のレシートはありません</p>
          ) : (
            <ul className="space-y-2">
              {selectedReceipts.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: CATEGORY_COLORS[r.category as Category] ?? '#94a3b8' }}
                  />
                  <span className="flex-1 text-sm text-slate-700">{r.store}</span>
                  <span className="text-sm font-semibold text-slate-700">{formatCurrency(r.total)}</span>
                </li>
              ))}
              <li className="flex justify-between text-sm font-bold text-slate-800 border-t pt-2 mt-2">
                <span>合計</span>
                <span>{formatCurrency(selectedReceipts.reduce((s, r) => s + r.total, 0))}</span>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
