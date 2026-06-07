import { useState } from 'react';
import { CheckCircle, Trash2 } from 'lucide-react';

const BUDGET_KEY = 'monthly_budget';
const BACKEND_KEY = 'backend_url';

export default function SettingsPage() {
  const [budget, setBudget] = useState(() => localStorage.getItem(BUDGET_KEY) ?? '100000');
  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem(BACKEND_KEY) ?? 'http://localhost:8000');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(BUDGET_KEY, budget);
    localStorage.setItem(BACKEND_KEY, backendUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = () => {
    if (!confirm('すべてのレシートデータを削除します。よろしいですか？')) return;
    localStorage.removeItem('receipts');
    alert('削除しました');
  };

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-xl font-bold text-slate-800">設定</h2>

      <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
        {/* 月次予算 */}
        <div className="p-5">
          <h3 className="font-semibold text-slate-700 mb-1">月次予算</h3>
          <p className="text-xs text-slate-400 mb-3">ダッシュボードの先月比計算に使用します</p>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">¥</span>
            <input
              type="number"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min={0}
              step={1000}
            />
          </div>
        </div>

        {/* バックエンドURL */}
        <div className="p-5">
          <h3 className="font-semibold text-slate-700 mb-1">バックエンドURL</h3>
          <p className="text-xs text-slate-400 mb-3">OCR APIのエンドポイント（Viteのプロキシ経由）</p>
          <input
            type="url"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        {saved ? <CheckCircle size={16} /> : null}
        {saved ? '保存しました' : '設定を保存'}
      </button>

      {/* 危険ゾーン */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-red-100">
        <h3 className="font-semibold text-red-600 mb-1">データ削除</h3>
        <p className="text-xs text-slate-500 mb-3">すべてのレシートデータを削除します。この操作は取り消せません。</p>
        <button
          onClick={handleClearData}
          className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"
        >
          <Trash2 size={14} />
          データをすべて削除
        </button>
      </div>
    </div>
  );
}
