insert into storage.buckets (id, name, public)
values ('app-releases', 'app-releases', true)
on conflict (id) do update set public = true;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'app-releases public read'
  ) then
    create policy "app-releases public read"
      on storage.objects for select
      using (bucket_id = 'app-releases');
  end if;
end $$;