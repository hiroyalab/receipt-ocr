import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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

- 金額は税込の数値のみ（円マーク・カンマ不要）
- 商品名は簡潔に
- JSONのみ返してください（説明文不要）`;

export const config = { api: { bodyParser: false } };

async function readBody(req: VercelRequest): Promise<{ imageBase64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const boundary = req.headers['content-type']?.split('boundary=')[1];
      if (!boundary) return reject(new Error('boundary not found'));

      const sep = Buffer.from(`--${boundary}`);
      const parts = [];
      let start = 0;
      while (true) {
        const idx = body.indexOf(sep, start);
        if (idx === -1) break;
        parts.push(body.slice(start, idx));
        start = idx + sep.length;
      }

      for (const part of parts) {
        if (!part.includes(Buffer.from('filename='))) continue;
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        const header = part.slice(0, headerEnd).toString();
        const contentType = header.match(/Content-Type:\s*(.+)/i)?.[1]?.trim() ?? 'image/jpeg';
        const imageData = part.slice(headerEnd + 4, part.length - 2);
        return resolve({ imageBase64: imageData.toString('base64'), mimeType: contentType });
      }
      reject(new Error('image not found in form data'));
    });
    req.on('error', reject);
  });
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  try {
    const { imageBase64, mimeType } = await readBody(req);
    const ai = new GoogleGenAI({ apiKey });
    let text = await callGemini(ai, imageBase64, mimeType);
    if (text.startsWith('```')) {
      text = text.split('```')[1];
      if (text.startsWith('json')) text = text.slice(4);
    }
    const parsed = JSON.parse(text.trim());
    res.json({ success: true, image_base64: imageBase64, raw_lines: [], ...parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OCR処理に失敗しました';
    res.status(500).json({ error: msg });
  }
}
