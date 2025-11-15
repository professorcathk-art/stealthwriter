import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicAnonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || (!serviceRoleKey && !publicAnonKey)) {
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
let cachedAnonClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(accessToken?: string) {
  const keyToUse = serviceRoleKey ?? publicAnonKey;

  if (accessToken) {
    return createSupabaseClient(keyToUse, accessToken);
  }

  if (serviceRoleKey) {
    if (!cachedServiceClient) {
      cachedServiceClient = createSupabaseClient(serviceRoleKey);
    }
    return cachedServiceClient;
  }

  if (!cachedAnonClient) {
    cachedAnonClient = createSupabaseClient(publicAnonKey);
  }

  console.warn(
    'Using anonymous Supabase key for server operations. Ensure RLS policies permit the required access.'
  );

  return cachedAnonClient;
}


