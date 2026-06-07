import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { saveSession } from '../lib/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('ユーザー名を入力してください');
      return;
    }
    // バックエンド未実装のため、ユーザー名をそのままトークンとして扱う
    saveSession(trimmed, trimmed);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-indigo-600 rounded-2xl items-center justify-center mb-4">
            <User size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">家計簿アプリ</h1>
          <p className="text-sm text-slate-500 mt-1">ユーザー名を入力してください</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm p-8 space-y-5"
        >
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              ユーザー名
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              placeholder="例: taro"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
            />
            {error && (
              <p className="mt-1.5 text-xs text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            はじめる
          </button>
        </form>
      </div>
    </div>
  );
}
