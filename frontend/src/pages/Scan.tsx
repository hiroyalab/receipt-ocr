import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, AlertCircle, CloudUpload, CheckCircle2, RotateCw, X } from 'lucide-react';
import { createOcrJob, getOcrJobs, retryOcrJob, deleteOcrJob } from '../lib/api';
import { getUsername } from '../lib/auth';
import type { OcrJob } from '../types';
const h30 = { height: '30px' };

type Step = 'upload' | 'loading';

const POLL_MS = 3000;
// processing のまま更新が止まったジョブは失敗扱いにする
const STALE_MS = 3 * 60 * 1000;

function isStale(job: OcrJob) {
  return job.status === 'processing' && Date.now() - new Date(job.updated_at).getTime() > STALE_MS;
}

export default function Scan() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(false);
  const [jobs, setJobs] = useState<OcrJob[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const loadJobs = useCallback(() => {
    getOcrJobs().then(setJobs).catch(() => { /* 次回ポーリングで再取得 */ });
  }, []);

  useEffect(() => {
    getOcrJobs().then(setJobs).catch((e) => setError(e.message ?? String(e)));
  }, []);

  const hasRunning = jobs.some((j) => (j.status === 'pending' || j.status === 'processing') && !isStale(j));
  useEffect(() => {
    if (!hasRunning) return;
    const timer = setInterval(loadJobs, POLL_MS);
    return () => clearInterval(timer);
  }, [hasRunning, loadJobs]);

  const selectFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('画像ファイルを選択してください'); return; }
    setError('');
    setNotice('');
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
      await createOcrJob(file, getUsername() ?? '');
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      setNotice('OCRを受け付けました。完了すると下の一覧から確認できます');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCRに失敗しました');
    } finally {
      setStep('upload');
      loadJobs();
    }
  };

  const handleRetry = async (job: OcrJob) => {
    try {
      await retryOcrJob(job.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCRの再実行に失敗しました');
    }
    loadJobs();
  };

  const handleDelete = async (job: OcrJob) => {
    if (!confirm('このOCR結果を破棄しますか？')) return;
    try {
      await deleteOcrJob(job);
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    }
    loadJobs();
  };

  const openJob = (job: OcrJob) => {
    navigate('/receipt/confirm', {
      state: { mode: 'ocr', result: job.result, file: null, imageUrl: job.image_url, jobId: job.id },
    });
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
            {notice && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 size={13} /> {notice}
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
              ? <><Loader2 size={16} className="animate-spin" /> アップロード中...</>
              : <><Upload size={15} /> 読み取りを開始する</>
            }
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">
            ※ OCRはバックグラウンドで処理されます。続けて別のレシートも登録できます
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

      {jobs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm font-bold text-slate-700 mb-3">OCR結果</p>
          <div className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onOpen={openJob} onRetry={handleRetry} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobRow({ job, onOpen, onRetry, onDelete }: {
  job: OcrJob;
  onOpen: (job: OcrJob) => void;
  onRetry: (job: OcrJob) => void;
  onDelete: (job: OcrJob) => void;
}) {
  const failed = job.status === 'error' || isStale(job);
  const running = !failed && (job.status === 'pending' || job.status === 'processing');
  const createdAt = new Date(job.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center gap-3 py-2.5">
      <img src={job.image_url} alt="receipt" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate">
          {job.status === 'done' ? (job.result?.store || '店名不明') : createdAt}
        </p>
        <p className={`text-xs truncate ${failed ? 'text-red-500' : 'text-slate-400'}`}>
          {running && '処理中...'}
          {job.status === 'done' && `${createdAt} ・ 確認待ち`}
          {failed && (job.error ?? 'タイムアウトしました')}
        </p>
      </div>
      {running && <Loader2 size={16} className="animate-spin text-indigo-500 shrink-0" />}
      {job.status === 'done' && (
        <button onClick={() => onOpen(job)} style={h30}
          className="px-4 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors shrink-0">
          確認する
        </button>
      )}
      {failed && (
        <button onClick={() => onRetry(job)} style={h30}
          className="flex items-center gap-1 px-3 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
          <RotateCw size={13} /> 再実行
        </button>
      )}
      <button onClick={() => onDelete(job)}
        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors shrink-0">
        <X size={15} />
      </button>
    </div>
  );
}
