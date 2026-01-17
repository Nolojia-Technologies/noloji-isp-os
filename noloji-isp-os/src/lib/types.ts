// Core types for the ISP OS application

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'ops_manager' | 'technician' | 'billing_agent' | 'viewer';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  geo: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'paused' | 'unpaid' | 'suspended';
  planId: string;
  devices: string[];
  createdAt: string;
  lastPayment?: string;
  assignedTechnicianId?: string;
  billingHistory?: BillingRecord[];
}

export interface Device {
  id: string;
  type: 'mikrotik_router' | 'onu' | 'ont' | 'switch' | 'olt';
  model: string;
  serial: string;
  mac: string;
  ip: string;
  online: boolean;
  firmware: string;
  assignedTo?: string;
  location?: {
    lat: number;
    lng: number;
  };
  lastSeen: string;
  config?: DeviceConfig;
  metrics?: DeviceMetrics;
}

export interface DeviceConfig {
  template: string;
  vlan: number;
  bandwidth: {
    upload: number;
    download: number;
  };
  pppoe?: {
    username: string;
    password: string;
  };
}

export interface DeviceMetrics {
  cpu: number;
  memory: number;
  uptime: number;
  trafficRx: number;
  trafficTx: number;
  signalStrength?: number;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  currentStatus: 'idle' | 'en-route' | 'working' | 'off-shift';
  location?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  assignedJobs: string[];
  skills: string[];
  performanceScore: number;
  createdAt: string;
}

export interface Job {
  id: string;
  type: 'install' | 'repair' | 'audit' | 'maintenance';
  customerId: string;
  technicianId?: string;
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledAt: string;
  completedAt?: string;
  location: {
    lat: number;
    lng: number;
  };
  description: string;
  notes?: string;
  photos?: string[];
  signature?: string;
}

export interface BillingRecord {
  id: string;
  customerId: string;
  amount: number;
  currency: 'KES';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  dueDate: string;
  paidAt?: string;
  paymentMethod?: 'mpesa' | 'card' | 'bank' | 'cash';
  description: string;
  invoiceNumber: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: 'KES';
  bandwidth: {
    upload: number;
    download: number;
  };
  dataLimit?: number; // GB, null for unlimited
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  features: string[];
  active: boolean;
}

export interface Hotspot {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  ssid: string;
  status: 'active' | 'inactive' | 'maintenance';
  captivePortal: {
    enabled: boolean;
    theme: string;
    loginMethods: ('voucher' | 'social' | 'mpesa' | 'sms')[];
    redirectUrl?: string;
  };
  activeSessions: number;
  totalSessions: number;
  revenue: number;
  deviceId: string;
}

export interface Voucher {
  id: string;
  code: string;
  hotspotId: string;
  type: 'time' | 'data';
  value: number; // minutes or MB
  price: number;
  currency: 'KES';
  status: 'active' | 'used' | 'expired';
  createdAt: string;
  usedAt?: string;
  expiresAt?: string;
}

export interface FiberRoute {
  id: string;
  name: string;
  type: 'fiber_cable' | 'splice' | 'fat' | 'splitter';
  geometry: GeoJSON.LineString | GeoJSON.Point;
  attributes: {
    coreCount?: number;
    cableType?: string;
    installedAt?: string;
    capacity?: number;
    splitterRatio?: string;
    loss?: number; // dB
  };
  parentRouteId?: string;
  childRoutes?: string[];
}

export interface Alert {
  id: string;
  type: 'device_offline' | 'payment_failed' | 'job_overdue' | 'bandwidth_high' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  affectedEntity: {
    type: 'customer' | 'device' | 'technician' | 'job';
    id: string;
    name: string;
  };
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  assignedTo?: string;
}

// Real-time event types
export interface TechnicianLocationEvent {
  type: 'technicianLocation';
  payload: {
    techId: string;
    lat: number;
    lng: number;
    timestamp: string;
    status: Technician['currentStatus'];
    jobId?: string;
  };
}

export interface DeviceStatusEvent {
  type: 'deviceStatus';
  payload: {
    deviceId: string;
    online: boolean;
    metrics: DeviceMetrics;
    timestamp: string;
  };
}

export interface AlertEvent {
  type: 'alert';
  payload: Alert;
}

export type WebSocketEvent = TechnicianLocationEvent | DeviceStatusEvent | AlertEvent;

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Filter and query types
export interface CustomerFilters {
  status?: Customer['status'];
  planId?: string;
  search?: string;
  area?: string;
  unpaidDays?: number;
}

export interface DeviceFilters {
  type?: Device['type'];
  online?: boolean;
  assignedTo?: string;
  search?: string;
}

export interface TechnicianFilters {
  status?: Technician['status'];
  currentStatus?: Technician['currentStatus'];
  skills?: string[];
}

export interface JobFilters {
  type?: Job['type'];
  status?: Job['status'];
  priority?: Job['priority'];
  technicianId?: string;
  customerId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Form types for device adoption
export interface DeviceAdoptionForm {
  serialOrMac: string;
  customerId?: string;
  templateId: string;
  newCustomer?: {
    name: string;
    phone: string;
    email: string;
    address: string;
    geo: {
      lat: number;
      lng: number;
    };
  };
}

// Chart data types for dashboard
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface KPIMetric {
  label: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  period: string;
}