// Database types for Supabase
// These types match the database schema

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            admins: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    phone: string | null;
                    role: string;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    full_name?: string | null;
                    phone?: string | null;
                    role?: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string | null;
                    phone?: string | null;
                    role?: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            routers: {
                Row: {
                    id: number;
                    name: string;
                    host: string;
                    api_port: number;
                    api_username: string;
                    api_password: string;
                    nas_identifier: string | null;
                    radius_secret: string;
                    location: string | null;
                    is_active: boolean;
                    last_seen: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    name: string;
                    host: string;
                    api_port?: number;
                    api_username: string;
                    api_password: string;
                    nas_identifier?: string | null;
                    radius_secret: string;
                    location?: string | null;
                    is_active?: boolean;
                    last_seen?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    name?: string;
                    host?: string;
                    api_port?: number;
                    api_username?: string;
                    api_password?: string;
                    nas_identifier?: string | null;
                    radius_secret?: string;
                    location?: string | null;
                    is_active?: boolean;
                    last_seen?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            plans: {
                Row: {
                    id: number;
                    name: string;
                    description: string | null;
                    upload_speed: number | null;
                    download_speed: number | null;
                    session_timeout: number | null;
                    idle_timeout: number | null;
                    validity_days: number | null;
                    data_limit_mb: number | null;
                    price: number | null;
                    currency: string;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    name: string;
                    description?: string | null;
                    upload_speed?: number | null;
                    download_speed?: number | null;
                    session_timeout?: number | null;
                    idle_timeout?: number | null;
                    validity_days?: number | null;
                    data_limit_mb?: number | null;
                    price?: number | null;
                    currency?: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    name?: string;
                    description?: string | null;
                    upload_speed?: number | null;
                    download_speed?: number | null;
                    session_timeout?: number | null;
                    idle_timeout?: number | null;
                    validity_days?: number | null;
                    data_limit_mb?: number | null;
                    price?: number | null;
                    currency?: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            customers: {
                Row: {
                    id: number;
                    username: string;
                    password: string;
                    email: string | null;
                    phone: string | null;
                    full_name: string | null;
                    address: string | null;
                    id_number: string | null;
                    plan_id: number | null;
                    router_id: number | null;
                    connection_type: string;
                    is_active: boolean;
                    is_online: boolean;
                    valid_from: string;
                    valid_until: string | null;
                    total_data_used_mb: number;
                    total_session_time: number;
                    mac_address: string | null;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                    last_login: string | null;
                };
                Insert: {
                    id?: number;
                    username: string;
                    password: string;
                    email?: string | null;
                    phone?: string | null;
                    full_name?: string | null;
                    address?: string | null;
                    id_number?: string | null;
                    plan_id?: number | null;
                    router_id?: number | null;
                    connection_type?: string;
                    is_active?: boolean;
                    is_online?: boolean;
                    valid_from?: string;
                    valid_until?: string | null;
                    total_data_used_mb?: number;
                    total_session_time?: number;
                    mac_address?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    last_login?: string | null;
                };
                Update: {
                    id?: number;
                    username?: string;
                    password?: string;
                    email?: string | null;
                    phone?: string | null;
                    full_name?: string | null;
                    address?: string | null;
                    id_number?: string | null;
                    plan_id?: number | null;
                    router_id?: number | null;
                    connection_type?: string;
                    is_active?: boolean;
                    is_online?: boolean;
                    valid_from?: string;
                    valid_until?: string | null;
                    total_data_used_mb?: number;
                    total_session_time?: number;
                    mac_address?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    last_login?: string | null;
                };
            };
            vouchers: {
                Row: {
                    id: number;
                    code: string;
                    pin: string | null;
                    plan_id: number | null;
                    batch_id: string | null;
                    status: string;
                    used_by: number | null;
                    used_at: string | null;
                    valid_from: string;
                    valid_until: string | null;
                    created_by: string | null;
                    notes: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: number;
                    code: string;
                    pin?: string | null;
                    plan_id?: number | null;
                    batch_id?: string | null;
                    status?: string;
                    used_by?: number | null;
                    used_at?: string | null;
                    valid_from?: string;
                    valid_until?: string | null;
                    created_by?: string | null;
                    notes?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: number;
                    code?: string;
                    pin?: string | null;
                    plan_id?: number | null;
                    batch_id?: string | null;
                    status?: string;
                    used_by?: number | null;
                    used_at?: string | null;
                    valid_from?: string;
                    valid_until?: string | null;
                    created_by?: string | null;
                    notes?: string | null;
                    created_at?: string;
                };
            };
            sessions: {
                Row: {
                    id: number;
                    session_id: string;
                    customer_id: number | null;
                    username: string;
                    router_id: number | null;
                    nas_ip_address: string | null;
                    nas_identifier: string | null;
                    nas_port_id: string | null;
                    framed_ip_address: string | null;
                    mac_address: string | null;
                    start_time: string;
                    stop_time: string | null;
                    session_duration: number;
                    last_update: string;
                    input_octets: number;
                    output_octets: number;
                    input_packets: number;
                    output_packets: number;
                    input_gigawords: number;
                    output_gigawords: number;
                    input_rate: number | null;
                    output_rate: number | null;
                    status: string;
                    terminate_cause: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    session_id: string;
                    customer_id?: number | null;
                    username: string;
                    router_id?: number | null;
                    nas_ip_address?: string | null;
                    nas_identifier?: string | null;
                    nas_port_id?: string | null;
                    framed_ip_address?: string | null;
                    mac_address?: string | null;
                    start_time?: string;
                    stop_time?: string | null;
                    session_duration?: number;
                    last_update?: string;
                    input_octets?: number;
                    output_octets?: number;
                    input_packets?: number;
                    output_packets?: number;
                    input_gigawords?: number;
                    output_gigawords?: number;
                    input_rate?: number | null;
                    output_rate?: number | null;
                    status?: string;
                    terminate_cause?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    session_id?: string;
                    customer_id?: number | null;
                    username?: string;
                    router_id?: number | null;
                    nas_ip_address?: string | null;
                    nas_identifier?: string | null;
                    nas_port_id?: string | null;
                    framed_ip_address?: string | null;
                    mac_address?: string | null;
                    start_time?: string;
                    stop_time?: string | null;
                    session_duration?: number;
                    last_update?: string;
                    input_octets?: number;
                    output_octets?: number;
                    input_packets?: number;
                    output_packets?: number;
                    input_gigawords?: number;
                    output_gigawords?: number;
                    input_rate?: number | null;
                    output_rate?: number | null;
                    status?: string;
                    terminate_cause?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            sms_credits: {
                Row: {
                    id: number;
                    balance: number;
                    cost_per_sms: number;
                    currency: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    balance?: number;
                    cost_per_sms?: number;
                    currency?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    balance?: number;
                    cost_per_sms?: number;
                    currency?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            sms_logs: {
                Row: {
                    id: number;
                    recipient: string;
                    message: string;
                    sender_id: string | null;
                    customer_id: number | null;
                    status: string;
                    provider_message_id: string | null;
                    provider_response: Json | null;
                    cost: number | null;
                    created_at: string;
                    sent_at: string | null;
                };
                Insert: {
                    id?: number;
                    recipient: string;
                    message: string;
                    sender_id?: string | null;
                    customer_id?: number | null;
                    status?: string;
                    provider_message_id?: string | null;
                    provider_response?: Json | null;
                    cost?: number | null;
                    created_at?: string;
                    sent_at?: string | null;
                };
                Update: {
                    id?: number;
                    recipient?: string;
                    message?: string;
                    sender_id?: string | null;
                    customer_id?: number | null;
                    status?: string;
                    provider_message_id?: string | null;
                    provider_response?: Json | null;
                    cost?: number | null;
                    created_at?: string;
                    sent_at?: string | null;
                };
            };
            sms_templates: {
                Row: {
                    id: number;
                    name: string;
                    category: string;
                    content: string;
                    variables: Json | null;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: number;
                    name: string;
                    category: string;
                    content: string;
                    variables?: Json | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: number;
                    name?: string;
                    category?: string;
                    content?: string;
                    variables?: Json | null;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
    };
}

// Convenience type aliases
export type Admin = Database['public']['Tables']['admins']['Row'];
export type Router = Database['public']['Tables']['routers']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Voucher = Database['public']['Tables']['vouchers']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type SmsCredit = Database['public']['Tables']['sms_credits']['Row'];
export type SmsLog = Database['public']['Tables']['sms_logs']['Row'];
export type SmsTemplate = Database['public']['Tables']['sms_templates']['Row'];
