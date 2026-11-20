do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'copypaste_post_reactions') then
      alter publication supabase_realtime add table public.copypaste_post_reactions;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'copypaste_comments') then
      alter publication supabase_realtime add table public.copypaste_comments;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'copypaste_comment_reactions') then
      alter publication supabase_realtime add table public.copypaste_comment_reactions;
    end if;
  end if;
end;
$$;
