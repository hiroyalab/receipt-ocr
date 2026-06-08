import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, AlertCircle, CloudUpload } from 'lucide-react';
import { ocrReceipt } from '../lib/api';
import { getUsername } from '../lib/auth';

const h30 = { height: '30px' };

type Step = 'upload' | 'loading';

export default function Scan() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const username = getUsername() ?? '';

  const selectFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('画像ファイルを選択してください'); return; }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }, [selectFile]);

  const handleOcr = async () => {
    if (!file) return;
    setStep('loading');
    try {
      const res = await ocrReceipt(file, username);
      navigate('/receipt/confirm', { state: { mode: 'ocr', result: res, preview } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCRに失敗しました');
      setStep('upload');
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <h2 className="text-xl font-bold text-slate-900">レシート登録</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-5">
          {/* ドロップゾーン */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-14 transition-all ${
              dragging ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <CloudUpload size={36} className="text-slate-300" />
            <p className="text-sm text-slate-500">ここにドラッグ&ドロップ</p>
            <p className="text-xs text-slate-400">または</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && selectFile(e.target.files[0])} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={h30}
              className="px-5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ファイルを選択
            </button>
            <p className="text-xs text-slate-300">対応形式: jpg / png / pdf</p>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                <AlertCircle size={13} /> {error}
              </div>
            )}
          </div>

          {/* プレビュー */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">プレビュー</p>
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[160px] overflow-hidden">
              {preview
                ? <img src={preview} alt="preview" className="w-full h-full object-contain" />
                : <span className="text-xs text-slate-300">選択後に表示</span>
              }
            </div>
          </div>
        </div>

        {/* OCR開始ボタン */}
        <div>
          <button
            onClick={handleOcr}
            disabled={!file || step === 'loading'}
            style={{ height: '30px' }}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-indigo-200"
          >
            {step === 'loading'
              ? <><Loader2 size={16} className="animate-spin" /> OCR処理中...</>
              : <><Upload size={15} /> 読み取りを開始する</>
            }
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">
            ※ OCR処理後、レシート情報画面に遷移します
          </p>
          <button
            onClick={() => navigate('/receipt/confirm', { state: { mode: 'ocr', result: { store: '', date: '', items: [] }, preview: null } })}
            style={{ height: '30px', marginTop: '12px' }}
            className="w-full flex items-center justify-center text-sm font-semibold text-indigo-600 border border-indigo-300 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            手動で入力する
          </button>
        </div>
      </div>
    </div>
  );
}
