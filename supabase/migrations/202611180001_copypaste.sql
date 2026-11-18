-- copypaste: anonymous daily message stream
create table if not exists public.copypaste_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  hex_login text not null unique,
  created_at timestamptz not null default now(),
  constraint copypaste_profiles_hex_format check (hex_login ~ '^#[0-9A-F]{6}$')
);

create or replace function public.copypaste_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := '#' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.copypaste_profiles where hex_login = candidate
    );
  end loop;

  insert into public.copypaste_profiles (id, hex_login)
  values (new.id, candidate)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.copypaste_create_profile() from public, anon, authenticated;

drop trigger if exists copypaste_on_auth_user_created on auth.users;
create trigger copypaste_on_auth_user_created
after insert on auth.users
for each row execute function public.copypaste_create_profile();

insert into public.copypaste_profiles (id, hex_login)
select u.id,
       '#' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6))
from auth.users u
where not exists (
  select 1 from public.copypaste_profiles p where p.id = u.id
)
on conflict do nothing;

create table if not exists public.copypaste_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.copypaste_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  post_day date not null default ((now() at time zone 'Europe/Kyiv')::date),
  constraint copypaste_posts_content_length check (
    char_length(btrim(content)) between 1 and 280
  ),
  constraint copypaste_posts_one_per_day unique (author_id, post_day)
);

create index if not exists copypaste_posts_created_at_idx
  on public.copypaste_posts (created_at desc);

alter table public.copypaste_profiles enable row level security;
alter table public.copypaste_posts enable row level security;

drop policy if exists "copypaste profiles are visible to everyone" on public.copypaste_profiles;
create policy "copypaste profiles are visible to everyone"
  on public.copypaste_profiles for select
  to anon, authenticated using (true);

drop policy if exists "users can read all copypaste posts" on public.copypaste_posts;
create policy "users can read all copypaste posts"
  on public.copypaste_posts for select
  to anon, authenticated using (true);

drop policy if exists "users can publish their own copypaste post" on public.copypaste_posts;
create policy "users can publish their own copypaste post"
  on public.copypaste_posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and post_day = ((now() at time zone 'Europe/Kyiv')::date)
  );

grant select on public.copypaste_profiles to anon, authenticated;
grant select, insert on public.copypaste_posts to authenticated;

-- Realtime feed updates are optional; the site also refreshes the feed periodically.
