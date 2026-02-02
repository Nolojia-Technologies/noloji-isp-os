import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared Supabase Admin Client
 * Uses lazy initialization to avoid build-time errors when env vars are not available
 */

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Get the Supabase admin client (uses service role key)
 * This is lazily initialized to avoid build-time errors
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (!_supabaseAdmin) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
        }

        _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return _supabaseAdmin;
}

/**
 * Check if Supabase admin is configured
 */
export function isSupabaseAdminConfigured(): boolean {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
