// API client for ISP OS

import axios, { AxiosResponse } from 'axios';
import {
  ApiResponse,
  PaginatedResponse,
  Customer,
  Device,
  Technician,
  Job,
  BillingRecord,
  Hotspot,
  Voucher,
  FiberRoute,
  Alert,
  Plan,
  User,
  DeviceAdoptionForm,
  CustomerFilters,
  DeviceFilters,
  TechnicianFilters,
  JobFilters
} from './types';

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('noloji_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('noloji_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to handle API responses
const handleResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (response.data.success) {
    return response.data.data!;
  } else {
    throw new Error(response.data.error?.message || 'API request failed');
  }
};

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<any> => {
    const response = await api.post('/auth/login', { email, password });
    const data = response.data;
    if (data.success && data.data.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('noloji_token', data.data.token);
        localStorage.setItem('noloji_user', JSON.stringify(data.data.admin));
      }
      return data.data;
    }
    throw new Error(data.error || 'Login failed');
  },

  register: async (email: string, password: string, full_name: string, phone?: string): Promise<any> => {
    const response = await api.post('/auth/register', { email, password, full_name, phone });
    const data = response.data;
    if (data.success && data.data.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('noloji_token', data.data.token);
        localStorage.setItem('noloji_user', JSON.stringify(data.data.admin));
      }
      return data.data;
    }
    throw new Error(data.error || 'Registration failed');
  },

  getCurrentUser: async (): Promise<any> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  verifyToken: async (): Promise<boolean> => {
    try {
      const response = await api.get('/auth/verify');
      return response.data.success;
    } catch (error) {
      return false;
    }
  },

  updateProfile: async (full_name?: string, phone?: string): Promise<any> => {
    const response = await api.put('/auth/profile', { full_name, phone });
    return response.data;
  },

  changePassword: async (current_password: string, new_password: string): Promise<any> => {
    const response = await api.put('/auth/password', { current_password, new_password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('noloji_token');
        localStorage.removeItem('noloji_user');
      }
    }
  }
};

// Customer API
export const customerApi = {
  getCustomers: async (
    page: number = 1,
    limit: number = 10,
    filters?: CustomerFilters
  ): Promise<PaginatedResponse<Customer>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.planId && { planId: filters.planId }),
    });

    const response = await api.get(`/customers?${params}`);
    return handleResponse(response);
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const response = await api.get(`/customers/${id}`);
    return handleResponse(response);
  },

  createCustomer: async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    const response = await api.post('/customers', customer);
    return handleResponse(response);
  },

  updateCustomer: async (id: string, updates: Partial<Customer>): Promise<Customer> => {
    const response = await api.put(`/customers/${id}`, updates);
    return handleResponse(response);
  },

  deleteCustomer: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  }
};

// Device API
export const deviceApi = {
  getDevices: async (
    page: number = 1,
    limit: number = 10,
    filters?: DeviceFilters
  ): Promise<PaginatedResponse<Device>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.online !== undefined && { online: filters.online.toString() }),
      ...(filters?.assignedTo && { assignedTo: filters.assignedTo }),
    });

    const response = await api.get(`/devices?${params}`);
    return handleResponse(response);
  },

  getDevice: async (id: string): Promise<Device> => {
    const response = await api.get(`/devices/${id}`);
    return handleResponse(response);
  },

  adoptDevice: async (adoptionData: DeviceAdoptionForm): Promise<{
    device: Device;
    configPreview: string;
  }> => {
    const response = await api.post('/devices/adopt', adoptionData);
    return handleResponse(response);
  },

  getDeviceConfig: async (id: string): Promise<{ config: string; device: Device }> => {
    const response = await api.get(`/devices/${id}/config`);
    return handleResponse(response);
  },

  executeCommand: async (id: string, command: string): Promise<{
    output: string;
    timestamp: string;
  }> => {
    const response = await api.post(`/devices/${id}/commands`, { command });
    return handleResponse(response);
  }
};

// Technician API
export const technicianApi = {
  getTechnicians: async (
    page: number = 1,
    limit: number = 10,
    filters?: TechnicianFilters
  ): Promise<PaginatedResponse<Technician>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.currentStatus && { currentStatus: filters.currentStatus }),
    });

    const response = await api.get(`/technicians?${params}`);
    return handleResponse(response);
  },

  startShift: async (id: string): Promise<Technician> => {
    const response = await api.post(`/technicians/${id}/shift/start`);
    return handleResponse(response);
  },

  stopShift: async (id: string): Promise<Technician> => {
    const response = await api.post(`/technicians/${id}/shift/stop`);
    return handleResponse(response);
  }
};

// Job API
export const jobApi = {
  getJobs: async (
    page: number = 1,
    limit: number = 10,
    filters?: JobFilters
  ): Promise<PaginatedResponse<Job>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.technicianId && { technicianId: filters.technicianId }),
      ...(filters?.customerId && { customerId: filters.customerId }),
    });

    const response = await api.get(`/jobs?${params}`);
    return handleResponse(response);
  }
};

// Billing API
export const billingApi = {
  getInvoices: async (
    page: number = 1,
    limit: number = 10,
    status?: string,
    customerId?: string
  ): Promise<PaginatedResponse<BillingRecord>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(customerId && { customerId }),
    });

    const response = await api.get(`/invoices?${params}`);
    return handleResponse(response);
  },

  payInvoice: async (id: string, paymentMethod: string, amount: number): Promise<{
    transaction: {
      id: string;
      status: string;
      amount: number;
      method: string;
    };
  }> => {
    const response = await api.post(`/invoices/${id}/pay`, { paymentMethod, amount });
    return handleResponse(response);
  }
};

// Hotspot API
export const hotspotApi = {
  getHotspots: async (
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Hotspot>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await api.get(`/hotspots?${params}`);
    return handleResponse(response);
  },

  createVouchers: async (
    hotspotId: string,
    voucherData: {
      count: number;
      type: 'time' | 'data';
      value: number;
      price: number;
    }
  ): Promise<Voucher[]> => {
    const response = await api.post(`/hotspots/${hotspotId}/vouchers`, voucherData);
    return handleResponse(response);
  }
};

// GIS API
export const gisApi = {
  getRoutes: async (): Promise<FiberRoute[]> => {
    const response = await api.get('/gis/routes');
    return handleResponse(response);
  },

  createRoute: async (route: Omit<FiberRoute, 'id'>): Promise<FiberRoute> => {
    const response = await api.post('/gis/routes', route);
    return handleResponse(response);
  },

  suggestSplitter: async (routeId: string): Promise<{
    routeId: string;
    suggestion: string;
    predictedLossDb: number;
    supportedCustomers: number;
    confidence: number;
    reasoning: string;
  }> => {
    const response = await api.get(`/gis/suggest-splitter?routeId=${routeId}`);
    return handleResponse(response);
  }
};

// Dashboard API
export const dashboardApi = {
  getKPIs: async (): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    activeSessions: number;
    revenue30d: number;
    revenueChange: string;
    networkUptime: number;
    bandwidthUsage: number;
    onlineDevices: number;
    totalDevices: number;
    activeAlerts: number;
  }> => {
    const response = await api.get('/dashboard/kpis');
    return handleResponse(response);
  }
};

// Alerts API
export const alertApi = {
  getAlerts: async (
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Alert>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await api.get(`/alerts?${params}`);
    return handleResponse(response);
  }
};

// Plans API
export const planApi = {
  getPlans: async (): Promise<any> => {
    const response = await api.get('/plans');
    return response.data;
  },

  getPlanById: async (id: number): Promise<any> => {
    const response = await api.get(`/plans/${id}`);
    return response.data;
  },

  createPlan: async (plan: any): Promise<any> => {
    const response = await api.post('/plans', plan);
    return response.data;
  },

  updatePlan: async (id: number, updates: any): Promise<any> => {
    const response = await api.put(`/plans/${id}`, updates);
    return response.data;
  },

  deletePlan: async (id: number): Promise<any> => {
    const response = await api.delete(`/plans/${id}`);
    return response.data;
  },

  // Sync plan profile to all MikroTik routers
  syncToMikroTik: async (planId: number): Promise<{
    success: boolean;
    message: string;
    results?: any[];
  }> => {
    try {
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_SERVICE_URL || 'http://localhost:3001';
      const response = await fetch(`${mikrotikServiceUrl}/api/packages/${planId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to sync to MikroTik' };
    }
  }
};

// MikroTik API
export const mikrotikApi = {
  // Test connection to MikroTik router
  testConnection: async (): Promise<{
    success: boolean;
    connected: boolean;
    identity?: string;
    uptime?: string;
    version?: string;
    error?: string;
  }> => {
    const response = await api.get('/mikrotik/test');
    return response.data;
  },

  // Get system resources
  getSystemResources: async (): Promise<{
    uptime: string;
    version: string;
    freeMemory: number;
    totalMemory: number;
    cpuLoad: number;
    boardName: string;
  }> => {
    const response = await api.get('/mikrotik/resources');
    return response.data.data;
  },

  // Get active hotspot users
  getActiveHotspotUsers: async (): Promise<any[]> => {
    const response = await api.get('/mikrotik/hotspot/active');
    return response.data.data;
  },

  // Disconnect user
  disconnectUser: async (username: string): Promise<any> => {
    const response = await api.post(`/mikrotik/hotspot/disconnect/${username}`);
    return response.data;
  },

  // Get all simple queues
  getQueues: async (): Promise<any[]> => {
    const response = await api.get('/mikrotik/queues');
    return response.data.data;
  },

  // Add simple queue
  addQueue: async (data: {
    name: string;
    target: string;
    upload_limit: number;
    download_limit: number;
    comment?: string;
  }): Promise<any> => {
    const response = await api.post('/mikrotik/queues', data);
    return response.data;
  },

  // Check RADIUS configuration
  checkRadiusConfig: async (): Promise<any[]> => {
    const response = await api.get('/mikrotik/radius-config');
    return response.data.data;
  }
};

// Users API (Backend)
export const usersApi = {
  getUsers: async (): Promise<any> => {
    const response = await api.get('/users');
    return response.data;
  },

  getUserById: async (id: number): Promise<any> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData: {
    username: string;
    password: string;
    email?: string;
    phone?: string;
    full_name?: string;
    plan_id?: number;
    router_id?: number;
    connection_type?: string;
    valid_until?: string;
    mac_address?: string;
    address?: string;
    id_number?: string;
    notes?: string;
  }): Promise<any> => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (id: number, userData: any): Promise<any> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: number): Promise<any> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

// Vouchers API (Backend)
export const vouchersApi = {
  getVouchers: async (): Promise<any[]> => {
    const response = await api.get('/vouchers');
    return response.data.data;
  },

  generateVouchers: async (data: {
    plan_id: number;
    quantity: number;
    validity_days: number;
    include_pin?: boolean;
    batch_name?: string;
  }): Promise<any> => {
    const response = await api.post('/vouchers/generate', data);
    return response.data;
  }
};

// Sessions API (Backend)
export const sessionsApi = {
  getActiveSessions: async (): Promise<any[]> => {
    const response = await api.get('/sessions/active');
    return response.data.data;
  },

  getSessionStats: async (period: string = '24h'): Promise<any> => {
    const response = await api.get(`/sessions/stats?period=${period}`);
    return response.data.data;
  }
};

// Routers API (Backend)
export const routersApi = {
  getRouters: async (isActive?: boolean): Promise<any[]> => {
    const params = isActive !== undefined ? `?is_active=${isActive}` : '';
    const response = await api.get(`/routers${params}`);
    return response.data.data;
  },

  getRouterById: async (id: number): Promise<any> => {
    const response = await api.get(`/routers/${id}`);
    return response.data.data;
  },

  createRouter: async (data: any): Promise<any> => {
    const response = await api.post('/routers', data);
    return response.data;
  },

  updateRouter: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/routers/${id}`, data);
    return response.data;
  },

  deleteRouter: async (id: number): Promise<any> => {
    const response = await api.delete(`/routers/${id}`);
    return response.data;
  },

  updateRouterStatus: async (id: number, isActive: boolean): Promise<any> => {
    const response = await api.patch(`/routers/${id}/status`, { is_active: isActive });
    return response.data;
  }
};

// SMS API (Backend)
export const smsApi = {
  // Balance and Credits
  getBalance: async (): Promise<any> => {
    const response = await api.get('/sms/balance');
    return response.data.data;
  },

  addCredits: async (amount: number, costPerSms?: number): Promise<any> => {
    const response = await api.post('/sms/credits', { amount, cost_per_sms: costPerSms });
    return response.data;
  },

  updatePricing: async (costPerSms: number, currency?: string): Promise<any> => {
    const response = await api.put('/sms/pricing', { cost_per_sms: costPerSms, currency });
    return response.data;
  },

  // Sending
  sendSMS: async (recipient: string, message: string, userId?: number, senderId?: string): Promise<any> => {
    const response = await api.post('/sms/send', { recipient, message, user_id: userId, sender_id: senderId });
    return response.data;
  },

  sendBulkSMS: async (recipients: string[], message: string, senderId?: string): Promise<any> => {
    const response = await api.post('/sms/send-bulk', { recipients, message, sender_id: senderId });
    return response.data;
  },

  // Logs and Stats
  getLogs: async (userId?: number, status?: string, limit?: number, offset?: number): Promise<any> => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId.toString());
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await api.get(`/sms/logs?${params.toString()}`);
    return response.data;
  },

  getStats: async (): Promise<any> => {
    const response = await api.get('/sms/stats');
    return response.data.data;
  },

  // Templates
  getTemplates: async (category?: string): Promise<any[]> => {
    const params = category ? `?category=${category}` : '';
    const response = await api.get(`/sms/templates${params}`);
    return response.data.data;
  },

  createTemplate: async (data: any): Promise<any> => {
    const response = await api.post('/sms/templates', data);
    return response.data;
  },

  updateTemplate: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/sms/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: number): Promise<any> => {
    const response = await api.delete(`/sms/templates/${id}`);
    return response.data;
  }
};

// Export all APIs
export const nolojiApi = {
  auth: authApi,
  customers: customerApi,
  devices: deviceApi,
  technicians: technicianApi,
  jobs: jobApi,
  billing: billingApi,
  hotspots: hotspotApi,
  gis: gisApi,
  dashboard: dashboardApi,
  alerts: alertApi,
  plans: planApi,
  mikrotik: mikrotikApi,
  users: usersApi,
  vouchers: vouchersApi,
  sessions: sessionsApi,
  routers: routersApi,
  sms: smsApi
};