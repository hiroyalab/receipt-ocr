-- OCR 非同期ジョブ
create table if not exists ocr_jobs (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  image_path  text not null,
  image_url   text not null,
  status      text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  result      jsonb,
  error       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table ocr_jobs enable row level security;

create policy "anon can read ocr_jobs"
  on ocr_jobs for select using (true);

create policy "anon can insert ocr_jobs"
  on ocr_jobs for insert with check (true);

create policy "anon can update ocr_jobs"
  on ocr_jobs for update using (true);

create policy "anon can delete ocr_jobs"
  on ocr_jobs for delete using (true);
