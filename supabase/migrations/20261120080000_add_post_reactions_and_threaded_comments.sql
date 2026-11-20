create table if not exists public.copypaste_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.copypaste_posts(id) on delete cascade,
  user_id uuid not null references public.copypaste_profiles(id) on delete cascade,
  reaction text not null check (reaction in ('heart','like','laugh','idea')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.copypaste_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.copypaste_posts(id) on delete cascade,
  parent_id uuid references public.copypaste_comments(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.copypaste_profiles(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists copypaste_comments_post_created_idx on public.copypaste_comments (post_id, created_at desc);
create index if not exists copypaste_comments_parent_idx on public.copypaste_comments (parent_id, created_at desc);

create table if not exists public.copypaste_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.copypaste_comments(id) on delete cascade,
  user_id uuid not null references public.copypaste_profiles(id) on delete cascade,
  reaction text not null check (reaction in ('heart','like','laugh','idea')),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index if not exists copypaste_post_reactions_post_idx on public.copypaste_post_reactions (post_id);
create index if not exists copypaste_comment_reactions_comment_idx on public.copypaste_comment_reactions (comment_id);

alter table public.copypaste_post_reactions enable row level security;
alter table public.copypaste_comments enable row level security;
alter table public.copypaste_comment_reactions enable row level security;

create policy "post reactions are public" on public.copypaste_post_reactions for select to anon, authenticated using (true);
create policy "users add their own post reaction" on public.copypaste_post_reactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users change their own post reaction" on public.copypaste_post_reactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users remove their own post reaction" on public.copypaste_post_reactions for delete to authenticated using (user_id = (select auth.uid()));

create policy "comments are public" on public.copypaste_comments for select to anon, authenticated using (true);
create policy "registered users add comments" on public.copypaste_comments for insert to authenticated with check (author_id = (select auth.uid()));
create policy "authors edit their comments" on public.copypaste_comments for update to authenticated using (author_id = (select auth.uid()) and deleted_at is null) with check (author_id = (select auth.uid()));

create policy "comment reactions are public" on public.copypaste_comment_reactions for select to anon, authenticated using (true);
create policy "users add their own comment reaction" on public.copypaste_comment_reactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users change their own comment reaction" on public.copypaste_comment_reactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users remove their own comment reaction" on public.copypaste_comment_reactions for delete to authenticated using (user_id = (select auth.uid()));

grant select on public.copypaste_post_reactions, public.copypaste_comments, public.copypaste_comment_reactions to anon, authenticated;
grant insert, update, delete on public.copypaste_post_reactions, public.copypaste_comment_reactions to authenticated;
grant insert, update on public.copypaste_comments to authenticated;

create or replace function public.copypaste_validate_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_post uuid;
begin
  if tg_op = 'INSERT' then
    if new.author_id is distinct from auth.uid() then
      raise exception 'Comment author must be the current user';
    end if;
    if new.parent_id is not null then
      select c.post_id into parent_post from public.copypaste_comments c where c.id = new.parent_id;
      if parent_post is null or parent_post <> new.post_id then
        raise exception 'Reply must belong to the same post as its parent';
      end if;
    end if;
    return new;
  end if;
  if new.id is distinct from old.id or new.post_id is distinct from old.post_id
     or new.parent_id is distinct from old.parent_id or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Comment identity fields cannot be changed';
  end if;
  if old.deleted_at is not null then raise exception 'Deleted comments cannot be changed'; end if;
  new.edited_at := case when new.content is distinct from old.content then now() else old.edited_at end;
  return new;
end;
$$;
drop trigger if exists copypaste_validate_comment_trigger on public.copypaste_comments;
create trigger copypaste_validate_comment_trigger before insert or update on public.copypaste_comments
for each row execute function public.copypaste_validate_comment();
revoke all on function public.copypaste_validate_comment() from public, anon, authenticated;
