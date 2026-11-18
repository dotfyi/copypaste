-- Remove the previous forum and family-assistant schema.
-- Keep auth.users and the new copypaste tables intact.
drop table if exists
  public.birthdays,
  public.calendar_events,
  public.channel_messages,
  public.channels,
  public.delivery_logs,
  public.families,
  public.family_invites,
  public.family_members,
  public.notes,
  public.pending_actions,
  public.profiles,
  public.reminder_recipients,
  public.reminders,
  public.room_members,
  public.room_messages,
  public.rooms,
  public.shopping_items,
  public.shopping_lists,
  public.tasks,
  public.user_settings
cascade;
