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
