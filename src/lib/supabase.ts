import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  'https://ebngdngtlrzdzaojsggl.supabase.co',
  'sb_publishable_QxMbOMYZY_JcIO2M5ozPDQ_Uc4mykOf',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
);