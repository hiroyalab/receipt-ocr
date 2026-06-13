-- image_base64 を image_url に変更
alter table receipts rename column image_base64 to image_url;
alter table receipts alter column image_url type text;

-- Storage バケット作成
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Storage ポリシー
create policy "anon can upload receipt images"
  on storage.objects for insert
  with check (bucket_id = 'receipts');

create policy "public can read receipt images"
  on storage.objects for select
  using (bucket_id = 'receipts');

create policy "anon can delete receipt images"
  on storage.objects for delete
  using (bucket_id = 'receipts');
