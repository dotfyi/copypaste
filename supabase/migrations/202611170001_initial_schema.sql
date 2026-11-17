-- Family assistant initial schema.
-- Access is server-side only through the Worker service-role key.
create extension if not exists pgcrypto;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Наша сім’я',
  timezone text not null default 'Europe/Kyiv',
  created_by_telegram_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  telegram_user_id text not null unique,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (family_id, id)
);
create index family_members_family_idx on public.family_members(family_id);

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.family_members(id),
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index family_invites_active_idx on public.family_invites(code_hash, expires_at) where used_at is null;

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null unique references public.family_members(id) on delete cascade,
  timezone text not null default 'Europe/Kyiv',
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.family_members(id),
  title text not null,
  due_at timestamptz not null,
  visibility text not null check (visibility in ('personal', 'shared')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'cancelled', 'completed')),
  recurrence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_due_idx on public.reminders(due_at) where status = 'pending';
create index reminders_family_idx on public.reminders(family_id, due_at);

create table public.reminder_recipients (
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed')),
  delivered_at timestamptz,
  primary key (reminder_id, member_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.family_members(id),
  title text,
  body text not null,
  visibility text not null check (visibility in ('personal', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_family_idx on public.notes(family_id, created_at desc);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.family_members(id),
  name text not null,
  visibility text not null check (visibility in ('personal', 'shared')),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  name text not null,
  quantity text,
  is_purchased boolean not null default false,
  added_by uuid not null references public.family_members(id),
  purchased_by uuid references public.family_members(id),
  purchased_at timestamptz,
  created_at timestamptz not null default now()
);
create index shopping_items_list_idx on public.shopping_items(list_id, is_purchased);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.family_members(id),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  visibility text not null check (visibility in ('personal', 'shared')),
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calendar_events_start_idx on public.calendar_events(family_id, starts_at);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.family_members(id),
  assigned_to uuid references public.family_members(id),
  title text not null,
  description text,
  due_at timestamptz,
  visibility text not null check (visibility in ('personal', 'shared')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_family_status_idx on public.tasks(family_id, status);

create table public.birthdays (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.family_members(id),
  person_name text not null,
  birthday date not null,
  notes text,
  visibility text not null default 'shared' check (visibility in ('personal', 'shared')),
  created_at timestamptz not null default now()
);

create table public.pending_actions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  requested_by uuid not null references public.family_members(id),
  action_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'expired')),
  telegram_chat_id text not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now()
);
create index pending_actions_expiry_idx on public.pending_actions(expires_at) where status = 'pending';

create table public.delivery_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  telegram_message_id text,
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  unique (reminder_id, member_id)
);

-- All app data is accessed only by the trusted Worker. No browser/anon/authenticated
-- access is granted by this migration. RLS is enabled as defense in depth.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'families', 'family_members', 'family_invites', 'user_settings',
    'reminders', 'reminder_recipients', 'notes', 'shopping_lists',
    'shopping_items', 'calendar_events', 'tasks', 'birthdays',
    'pending_actions', 'delivery_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
