import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  '';

if (!supabaseUrl) {
  throw new Error('Supabase URL missing. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.');
}

if (!serviceRoleKey && !publicAnonKey) {
  throw new Error(
    'Supabase credentials missing. Provide SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

function createSupabaseClient(key: string, accessToken?: string) {
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

let cachedServiceClient: SupabaseClient | null = null;
let cachedServiceKey: string | null = null;

export function getSupabaseAuthClient(accessToken: string) {
  if (!publicAnonKey) {
    throw new Error('Supabase anon key missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (!accessToken) {
    throw new Error('Supabase access token missing for auth client.');
  }

  return createSupabaseClient(publicAnonKey, accessToken);
}

export function getSupabaseAdminClient(accessToken?: string) {
  if (serviceRoleKey) {
    if (!cachedServiceClient || cachedServiceKey !== serviceRoleKey) {
      cachedServiceClient = createSupabaseClient(serviceRoleKey);
      cachedServiceKey = serviceRoleKey;
    }
    return cachedServiceClient;
  }

  if (!accessToken) {
    throw new Error(
      'Supabase service role key missing and no access token provided for fallback.'
    );
  }

  console.warn(
    'Using anonymous Supabase key for privileged operations. Ensure RLS policies allow the required access.'
  );

  return getSupabaseAuthClient(accessToken);
}


