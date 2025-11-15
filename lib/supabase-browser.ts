'use client';

import { createBrowserClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase browser credentials. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!cachedClient) {
    cachedClient = createBrowserClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
  }

  return cachedClient;
}
import { createBrowserClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase browser credentials. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

let client:
  | ReturnType<typeof createBrowserClient<typeof import('@supabase/supabase-js').SupabaseClient['supabaseUrl']>>
  | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? ''
    );
  }

  return client;
}

