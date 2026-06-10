import { useState } from 'react';
import { Check, Trash2, PiggyBank } from 'lucide-react';
import { supabase } from '../lib/supabase';

const BUDGET_KEY = 'monthly_budget';

const inputClass = 'w-full px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition';
const inputStyle = { height: '30px', fontSize: '16px' };

export default function SettingsPage() {
  const [budget, setBudget] = useState(() => localStorage.getItem(BUDGET_KEY) ?? '100000');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(BUDGET_KEY, budget);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = async () => {
    if (!confirm('すべてのレシートデータを削除します。よろしいですか？')) return;
    const { error } = await supabase.from('receipts').delete().neq('id', '');
    if (error) { alert('削除に失敗しました'); return; }
    alert('削除しました');
  };

  return (
    <div className="max-w-lg space-y-5">
      <h2 className="text-xl font-bold text-slate-900">設定</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank size={15} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800">月次予算</h3>
          </div>
          <p className="text-xs text-slate-400 mb-3 ml-[23px]">ダッシュボードの予算比較に使用します</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 font-medium">¥</span>
            <input type="number" style={inputStyle} className={inputClass} value={budget} onChange={(e) => setBudget(e.target.value)} min={0} step={1000} />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        style={{ height: '30px' }}
        className={`flex items-center gap-2 px-5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
          saved ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-200'
        }`}
      >
        {saved && <Check size={15} />}
        {saved ? '保存しました' : '設定を保存'}
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
        <h3 className="text-sm font-bold text-red-500 mb-1">データ削除</h3>
        <p className="text-xs text-slate-400 mb-4">すべてのレシートデータを削除します。この操作は取り消せません。</p>
        <button
          onClick={handleClearData}
          style={{ height: '30px' }}
          className="flex items-center gap-2 px-4 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
          データをすべて削除
        </button>
      </div>
    </div>
  );
}
