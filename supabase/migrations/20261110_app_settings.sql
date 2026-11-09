-- 全端末で共有する設定（key/value）
create table if not exists app_settings (
  key         text primary key,
  value       integer not null check (value >= 0),
  updated_at  timestamptz default now()
);

alter table app_settings enable row level security;

create policy "anon can read app_settings"
  on app_settings for select using (true);

create policy "anon can insert app_settings"
  on app_settings for insert with check (true);

create policy "anon can update app_settings"
  on app_settings for update using (true);
