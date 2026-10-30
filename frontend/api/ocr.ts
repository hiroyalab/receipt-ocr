import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { waitUntil } from '@vercel/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PROMPT = `このレシート画像から以下の情報をJSON形式で抽出してください。

{
  "store": "店名",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "商品名", "price": 金額(整数), "quantity": 数量(整数) },
    ...
  ],
  "tax": 税額(整数),
  "total": 合計金額(整数)
}

- price はレシートに記載されている行の金額（行合計）にしてください
- 金額は数値のみ（円マーク・カンマ不要）
- 商品名は簡潔に
- JSONのみ返してください（説明文不要）`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

async function callGemini(ai: GoogleGenAI, imageBase64: string, mimeType: string): Promise<string> {
  let lastError: Error = new Error('Gemini API unavailable');
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [
          { text: PROMPT },
          { inlineData: { mimeType, data: imageBase64 } },
        ]}],
      });
      return response.text?.trim() ?? '';
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const isRetryable = lastError.message.includes('503') || lastError.message.includes('429');
      if (!isRetryable) throw lastError;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastError;
}

async function processJob(supabase: SupabaseClient, apiKey: string, jobId: string, imagePath: string) {
  try {
    const { data: blob, error } = await supabase.storage.from('receipts').download(imagePath);
    if (error || !blob) throw new Error('画像の取得に失敗しました');
    const imageBase64 = Buffer.from(await blob.arrayBuffer()).toString('base64');

    const ai = new GoogleGenAI({ apiKey });
    let text = await callGemini(ai, imageBase64, blob.type || 'image/jpeg');
    if (text.startsWith('```')) {
      text = text.split('```')[1];
      if (text.startsWith('json')) text = text.slice(4);
    }
    const parsed = JSON.parse(text.trim());
    await supabase
      .from('ocr_jobs')
      .update({ status: 'done', result: { success: true, raw_lines: [], ...parsed }, error: null, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OCR処理に失敗しました';
    await supabase
      .from('ocr_jobs')
      .update({ status: 'error', error: msg, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  }
}

// ジョブを受け付けたら 202 を即返し、OCR はレスポンス後に waitUntil で続行する
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase not configured' });

  const jobId = req.body?.job_id;
  if (typeof jobId !== 'string' || !UUID_RE.test(jobId)) return res.status(400).json({ error: 'job_id が不正です' });

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: job, error } = await supabase
    .from('ocr_jobs')
    .select('id, status, image_path')
    .eq('id', jobId)
    .single();
  if (error || !job) return res.status(404).json({ error: 'ジョブが見つかりません' });
  if (job.status === 'done') return res.status(409).json({ error: 'ジョブは処理済みです' });

  await supabase
    .from('ocr_jobs')
    .update({ status: 'processing', error: null, updated_at: new Date().toISOString() })
    .eq('id', jobId);

  waitUntil(processJob(supabase, apiKey, jobId, job.image_path));
  res.status(202).json({ job_id: jobId, status: 'processing' });
}
