import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, PackageOpen } from 'lucide-react';
import { getReceipts } from '../lib/api';
import { CATEGORY_COLORS } from '../types';
import type { Receipt, Category } from '../types';

function fmt(n: number) {
  return n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}
function compact(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`;
}

function GaugeCircle({ pct }: { pct: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f97316' : '#6366f1';
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
      <circle
        cx={50} cy={50} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={50} y={46} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#1e293b">{Math.round(pct)}%</text>
      <text x={50} y={62} textAnchor="middle" fontSize={9} fill="#94a3b8">達成率</text>
    </svg>
  );
}

export default function Dashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const now = new Date();
  const budget = Number(localStorage.getItem('monthly_budget') ?? 100000);

  useEffect(() => {
    getReceipts().then(setReceipts).catch(console.error);
  }, []);

  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const thisMonth = ym(now);
  const lastMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const thisMR = receipts.filter((r) => r.date.startsWith(thisMonth));
  const lastMR = receipts.filter((r) => r.date.startsWith(lastMonth));
  const todayR = receipts.filter((r) => r.date === todayStr);
  const thisTotal = thisMR.reduce((s, r) => s + r.total, 0);
  const lastTotal = lastMR.reduce((s, r) => s + r.total, 0);
  const todayTotal = todayR.reduce((s, r) => s + r.total, 0);
  const diff = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : null;
  const budgetPct = budget > 0 ? (thisTotal / budget) * 100 : 0;

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    thisMR.forEach((r) => { map[r.category] = (map[r.category] ?? 0) + r.total; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: Math.round((value / thisTotal) * 100) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [thisMR, thisTotal]);

  const monthlyData = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = ym(d);
      const total = receipts.filter((r) => r.date.startsWith(key)).reduce((s, r) => s + r.total, 0);
      result.push({ label: `${d.getMonth() + 1}月`, total, isCurrent: i === 0 });
    }
    return result;
  }, [receipts]);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">ホーム</h2>
        <span className="text-sm text-slate-400">{now.getFullYear()}年{now.getMonth() + 1}月</span>
      </div>

      {/* 1段目: 3カード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 今月の支出 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">今月の支出</p>
          <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{fmt(thisTotal)}</p>
          <div className="mt-3">
            {diff !== null ? (
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                diff >= 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {diff >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                先月比 {diff >= 0 ? '+' : ''}{diff}%
              </div>
            ) : (
              <p className="text-xs text-slate-400">先月データなし</p>
            )}
          </div>
        </div>

        {/* 予算達成率 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <GaugeCircle pct={budgetPct} />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">予算達成率</p>
            <p className="text-sm font-bold text-slate-800 tabular-nums">{fmt(thisTotal)}</p>
            <p className="text-xs text-slate-400 mt-0.5">予算 {fmt(budget)}</p>
          </div>
        </div>

        {/* 今日の支出 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">今日の支出</p>
          <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{fmt(todayTotal)}</p>
          <p className="text-xs text-slate-400 mt-3">{todayR.length}件のレシート</p>
        </div>
      </div>

      {/* 2段目: カテゴリ + 最近のレシート */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 支出カテゴリ TOP 5 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm font-bold text-slate-800 mb-4">支出カテゴリ TOP 5</p>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={34} outerRadius={56} dataKey="value" strokeWidth={2} stroke="#fff">
                      {categoryData.map((e) => (
                        <Cell key={e.name} fill={CATEGORY_COLORS[e.name as Category] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 min-w-0">
                {categoryData.map((e) => (
                  <li key={e.name} className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[e.name as Category] ?? '#94a3b8' }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{e.name}</span>
                    <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{e.pct}%</span>
                    <span className="text-xs font-bold text-slate-800 tabular-nums">{compact(e.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-sm text-slate-300">データなし</div>
          )}
        </div>

        {/* 最近のレシート */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800">最近のレシート</p>
            <Link to="/expenses" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
              すべて見る <ArrowUpRight size={12} />
            </Link>
          </div>
          {receipts.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <PackageOpen size={26} className="text-slate-300" />
              <p className="text-sm text-slate-400">レシートがありません</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {receipts.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                    style={{ background: CATEGORY_COLORS[r.category as Category] ?? '#94a3b8' }}>
                    {r.category.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{r.store}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{r.date}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 tabular-nums">{fmt(r.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 3段目: 月別グラフ（全幅） */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <p className="text-sm font-bold text-slate-800 mb-4">今月の支出グラフ</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData} barSize={28} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(v: number) => v === 0 ? '0' : `${Math.round(v / 1000)}k`}
              axisLine={false} tickLine={false} width={32}
            />
            <Tooltip
              formatter={(v) => fmt(Number(v))}
              contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,.06)' }}
              cursor={{ fill: '#f8fafc', radius: [4, 4, 0, 0] }}
            />
            <Bar dataKey="total" name="支出" radius={[5, 5, 0, 0]}>
              {monthlyData.map((e, i) => (
                <Cell key={i} fill={e.isCurrent ? '#6366f1' : '#e0e7ff'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
