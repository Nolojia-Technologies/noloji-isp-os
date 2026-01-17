// Supabase client for MikroTik service
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';
import logger from '../utils/logger';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!supabaseClient) {
        if (!config.supabase.url || !config.supabase.serviceKey) {
            throw new Error('Supabase configuration missing');
        }

        supabaseClient = createClient(config.supabase.url, config.supabase.serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        logger.info('Supabase client initialized');
    }

    return supabaseClient;
}

// Router types
export interface Router {
    id: number;
    name: string;
    host: string;
    api_port: number;
    api_username: string;
    api_password: string;
    use_ssl: boolean;
    is_active: boolean;
    role: 'hotspot' | 'pppoe' | 'edge';
    status: 'online' | 'offline' | 'degraded';
    last_health_check: string | null;
    cpu_usage: number | null;
    memory_usage: number | null;
    uptime: string | null;
    created_at: string;
}

export interface Customer {
    id: number;
    username: string;
    password: string;
    plan_id: number | null;
    router_id: number | null;
    connection_type: string;
    is_active: boolean;
    valid_until: string | null;
}

export interface Plan {
    id: number;
    name: string;
    upload_speed: number;
    download_speed: number;
    session_timeout: number | null;
}

// Database operations
export const db = {
    /**
     * Get all active routers
     */
    async getRouters(): Promise<Router[]> {
        const { data, error } = await getSupabase()
            .from('routers')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;
        return data || [];
    },

    /**
     * Get router by ID
     */
    async getRouterById(id: number): Promise<Router | null> {
        const { data, error } = await getSupabase()
            .from('routers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    /**
     * Update router health status
     */
    async updateRouterHealth(routerId: number, health: {
        status: 'online' | 'offline' | 'degraded';
        cpu_usage?: number;
        memory_usage?: number;
        uptime?: string;
    }): Promise<void> {
        const { error } = await getSupabase()
            .from('routers')
            .update({
                ...health,
                last_health_check: new Date().toISOString(),
            })
            .eq('id', routerId);

        if (error) {
            logger.error(`Failed to update router health: ${error.message}`);
        }
    },

    /**
     * Get customer by ID
     */
    async getCustomerById(id: number): Promise<Customer | null> {
        const { data, error } = await getSupabase()
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return null;
        return data;
    },

    /**
     * Get customer with plan and router
     */
    async getCustomerWithDetails(id: number): Promise<{
        customer: Customer;
        plan: Plan | null;
        router: Router | null;
    } | null> {
        const { data, error } = await getSupabase()
            .from('customers')
            .select(`
        *,
        plans:plan_id (*),
        routers:router_id (*)
      `)
            .eq('id', id)
            .single();

        if (error || !data) return null;

        return {
            customer: data,
            plan: data.plans || null,
            router: data.routers || null,
        };
    },

    /**
     * Log a router command
     */
    async logCommand(routerId: number, command: string, result: any, success: boolean, executionTime: number): Promise<void> {
        try {
            await getSupabase()
                .from('router_commands_log')
                .insert({
                    router_id: routerId,
                    command: command,
                    result: result,
                    success: success,
                    execution_time_ms: executionTime,
                });
        } catch (error) {
            logger.error('Failed to log command', { error });
        }
    },

    /**
     * Get expired customers that need suspension
     */
    async getExpiredCustomers(): Promise<Customer[]> {
        const { data, error } = await getSupabase()
            .from('customers')
            .select('*')
            .eq('is_active', true)
            .lt('valid_until', new Date().toISOString());

        if (error) return [];
        return data || [];
    },
};

export default db;
