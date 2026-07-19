do $$
begin
  if exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.digests'::regclass
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (digest_date, language)'
  ) then
    drop index if exists public.idx_digests_date_language;
  elsif to_regclass('public.idx_digests_date_language') is not null then
    alter table public.digests
      add constraint digests_digest_date_language_key
      unique using index idx_digests_date_language;
  else
    alter table public.digests
      add constraint digests_digest_date_language_key
      unique (digest_date, language);
  end if;
end;
$$;
