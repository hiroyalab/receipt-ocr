-- receipts テーブル
create table if not exists receipts (
  id          uuid primary key default gen_random_uuid(),
  username    text not null,
  store       text not null,
  date        date not null,
  items       jsonb not null default '[]',
  category    text not null,
  total       integer not null default 0,
  image_base64 text,
  created_at  timestamptz default now()
);

-- anon キーから読み書きできるよう RLS を設定
alter table receipts enable row level security;

create policy "anon can read receipts"
  on receipts for select using (true);

create policy "anon can insert receipts"
  on receipts for insert with check (true);

create policy "anon can update receipts"
  on receipts for update using (true);

create policy "anon can delete receipts"
  on receipts for delete using (true);
