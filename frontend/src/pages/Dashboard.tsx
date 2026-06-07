import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ShoppingCart } from 'lucide-react';
import { getReceipts } from '../lib/storage';
import { CATEGORY_COLORS } from '../types';
import type { Category } from '../types';

function formatCurrency(n: number) {
  return n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
}

export default function Dashboard() {
  const receipts = getReceipts();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const thisMonthReceipts = receipts.filter((r) => r.date.startsWith(thisMonth));
  const lastMonthReceipts = receipts.filter((r) => r.date.startsWith(lastMonth));

  const thisMonthTotal = thisMonthReceipts.reduce((s, r) => s + r.total, 0);
  const lastMonthTotal = lastMonthReceipts.reduce((s, r) => s + r.total, 0);

  const diff = lastMonthTotal > 0
    ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : 0;

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonthReceipts.forEach((r) => {
      map[r.category] = (map[r.category] ?? 0) + r.total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [thisMonth, receipts.length]);

  // 直近6ヶ月の月別合計
  const monthlyData = useMemo(() => {
    const months: { month: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${d.getMonth() + 1}月`;
      const total = receipts
        .filter((r) => r.date.startsWith(key))
        .reduce((s, r) => s + r.total, 0);
      months.push({ month: key, label, total });
    }
    return months;
  }, [receipts.length]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">ダッシュボード</h2>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="今月の支出"
          value={formatCurrency(thisMonthTotal)}
          icon={<Wallet size={20} className="text-indigo-500" />}
          bg="bg-indigo-50"
        />
        <StatCard
          label="先月比"
          value={`${diff >= 0 ? '+' : ''}${diff}%`}
          icon={
            diff >= 0
              ? <TrendingUp size={20} className="text-red-500" />
              : <TrendingDown size={20} className="text-green-500" />
          }
          bg={diff >= 0 ? 'bg-red-50' : 'bg-green-50'}
          valueClass={diff >= 0 ? 'text-red-600' : 'text-green-600'}
        />
        <StatCard
          label="今月の件数"
          value={`${thisMonthReceipts.length}件`}
          icon={<ShoppingCart size={20} className="text-amber-500" />}
          bg="bg-amber-50"
        />
        <StatCard
          label="先月の支出"
          value={formatCurrency(lastMonthTotal)}
          icon={<Wallet size={20} className="text-slate-400" />}
          bg="bg-slate-50"
          valueClass="text-slate-600"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* カテゴリ別円グラフ */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">カテゴリ別支出</h3>
          {categoryTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryTotals}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }: PieLabelRenderProps) =>
                    `${String(name ?? '')} ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {categoryTotals.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as Category] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="今月のデータがありません" />
          )}
        </div>

        {/* 月別棒グラフ */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">月別支出推移</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="total" name="支出" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 最近のレシート */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">最近のレシート</h3>
          <Link to="/expenses" className="text-sm text-indigo-600 hover:underline">すべて見る</Link>
        </div>
        {receipts.length === 0 ? (
          <EmptyState label="レシートがまだ登録されていません" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {receipts.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{r.store}</p>
                  <p className="text-xs text-slate-400">{r.date} · {r.category}</p>
                </div>
                <span className="font-semibold text-slate-700">{formatCurrency(r.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, bg, valueClass = 'text-slate-800' }: {
  label: string; value: string; icon: React.ReactNode; bg: string; valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-slate-400">{label}</div>
  );
}
