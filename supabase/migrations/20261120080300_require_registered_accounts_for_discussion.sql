drop policy if exists "users add their own post reaction" on public.copypaste_post_reactions;
create policy "users add their own post reaction" on public.copypaste_post_reactions
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
);
drop policy if exists "users change their own post reaction" on public.copypaste_post_reactions;
create policy "users change their own post reaction" on public.copypaste_post_reactions
for update to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
) with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
);
drop policy if exists "users remove their own post reaction" on public.copypaste_post_reactions;
create policy "users remove their own post reaction" on public.copypaste_post_reactions
for delete to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
);

drop policy if exists "registered users add comments" on public.copypaste_comments;
create policy "registered users add comments" on public.copypaste_comments
for insert to authenticated with check (
  author_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
);
drop policy if exists "authors edit their comments" on public.copypaste_comments;
create policy "authors edit their comments" on public.copypaste_comments
for update to authenticated using (
  author_id = (select auth.uid()) and deleted_at is null and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
) with check (
  author_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
);

drop policy if exists "users add their own comment reaction" on public.copypaste_comment_reactions;
create policy "users add their own comment reaction" on public.copypaste_comment_reactions
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
);
drop policy if exists "users change their own comment reaction" on public.copypaste_comment_reactions;
create policy "users change their own comment reaction" on public.copypaste_comment_reactions
for update to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
) with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
);
drop policy if exists "users remove their own comment reaction" on public.copypaste_comment_reactions;
create policy "users remove their own comment reaction" on public.copypaste_comment_reactions
for delete to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.copypaste_profiles p
    where p.id = (select auth.uid()) and p.is_registered and not coalesce(p.is_suspended, false)
  )
);
