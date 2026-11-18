create sequence if not exists public.copypaste_post_number_seq;

alter table public.copypaste_posts
  add column if not exists post_number bigint;

with numbered as (
  select id, row_number() over (order by created_at asc, id asc) as n
  from public.copypaste_posts
)
update public.copypaste_posts p
set post_number = numbered.n
from numbered
where p.id = numbered.id
  and p.post_number is null;

select setval(
  'public.copypaste_post_number_seq',
  coalesce((select max(post_number) from public.copypaste_posts), 1),
  exists (select 1 from public.copypaste_posts)
);

alter table public.copypaste_posts
  alter column post_number set default nextval('public.copypaste_post_number_seq'),
  alter column post_number set not null;

alter sequence public.copypaste_post_number_seq
  owned by public.copypaste_posts.post_number;

create unique index if not exists copypaste_posts_post_number_key
  on public.copypaste_posts (post_number);
