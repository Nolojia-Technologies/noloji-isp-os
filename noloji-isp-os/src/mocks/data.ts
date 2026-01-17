// Mock data for ISP OS

import {
  Customer,
  Device,
  Technician,
  Plan,
  BillingRecord,
  Job,
  Hotspot,
  Voucher,
  FiberRoute,
  Alert,
  User
} from "@/lib/types";

// Users
export const mockUsers: User[] = [
  {
    id: "user_001",
    name: "Admin User",
    email: "admin@noloji.com",
    phone: "+254712000001",
    role: "admin",
    createdAt: "2024-01-01T00:00:00Z",
    lastLogin: "2025-09-15T10:00:00Z"
  },
  {
    id: "user_002",
    name: "Operations Manager",
    email: "ops@noloji.com",
    phone: "+254712000002",
    role: "ops_manager",
    createdAt: "2024-01-01T00:00:00Z",
    lastLogin: "2025-09-15T09:30:00Z"
  }
];

// Plans
export const mockPlans: Plan[] = [
  {
    id: "plan_basic_10",
    name: "Basic 10 Mbps",
    price: 3500,
    currency: "KES",
    bandwidth: { upload: 2, download: 10 },
    billingCycle: "monthly",
    features: ["Basic Support", "Fair Usage Policy"],
    active: true
  },
  {
    id: "plan_premium_20",
    name: "Premium 20 Mbps",
    price: 5500,
    currency: "KES",
    bandwidth: { upload: 5, download: 20 },
    billingCycle: "monthly",
    features: ["Priority Support", "Static IP", "No FUP"],
    active: true
  },
  {
    id: "plan_business_50",
    name: "Business 50 Mbps",
    price: 12000,
    currency: "KES",
    bandwidth: { upload: 10, download: 50 },
    billingCycle: "monthly",
    features: ["24/7 Support", "Static IP", "SLA 99.9%", "Dedicated Line"],
    active: true
  }
];

// Customers
export const mockCustomers: Customer[] = [
  {
    id: "cust_0001",
    name: "Jane Doe",
    phone: "+254712000100",
    email: "jane.doe@gmail.com",
    address: "12 Riverside Ave, Westlands, Nairobi",
    geo: { lat: -1.2630, lng: 36.8063 },
    status: "active",
    planId: "plan_basic_10",
    devices: ["dev_0001"],
    createdAt: "2025-01-15T10:30:00Z",
    lastPayment: "2025-09-01T00:00:00Z",
    assignedTechnicianId: "tech_001"
  },
  {
    id: "cust_0002",
    name: "John Smith",
    phone: "+254712000101",
    email: "john.smith@gmail.com",
    address: "45 Karen Road, Karen, Nairobi",
    geo: { lat: -1.3197, lng: 36.6859 },
    status: "active",
    planId: "plan_premium_20",
    devices: ["dev_0002"],
    createdAt: "2025-02-03T14:20:00Z",
    lastPayment: "2025-09-05T00:00:00Z",
    assignedTechnicianId: "tech_002"
  },
  {
    id: "cust_0003",
    name: "Mary Johnson",
    phone: "+254712000102",
    email: "mary.johnson@business.com",
    address: "78 Industrial Area, Nairobi",
    geo: { lat: -1.3032, lng: 36.8516 },
    status: "unpaid",
    planId: "plan_business_50",
    devices: ["dev_0003"],
    createdAt: "2025-03-12T09:15:00Z",
    lastPayment: "2025-08-15T00:00:00Z",
    assignedTechnicianId: "tech_001"
  }
];

// Generate more customers programmatically
for (let i = 4; i <= 200; i++) {
  const customer: Customer = {
    id: `cust_${String(i).padStart(4, '0')}`,
    name: `Customer ${i}`,
    phone: `+25471200${String(i + 100).padStart(4, '0')}`,
    email: `customer${i}@email.com`,
    address: `${i} Example Street, Nairobi`,
    geo: {
      lat: -1.2921 + (Math.random() - 0.5) * 0.1,
      lng: 36.8219 + (Math.random() - 0.5) * 0.1
    },
    status: ['active', 'paused', 'unpaid'][Math.floor(Math.random() * 3)] as Customer['status'],
    planId: mockPlans[Math.floor(Math.random() * mockPlans.length)].id,
    devices: [`dev_${String(i).padStart(4, '0')}`],
    createdAt: new Date(2025, Math.floor(Math.random() * 8), Math.floor(Math.random() * 28) + 1).toISOString(),
    lastPayment: Math.random() > 0.3 ? new Date(2025, 8, Math.floor(Math.random() * 15) + 1).toISOString() : undefined,
    assignedTechnicianId: `tech_00${Math.floor(Math.random() * 5) + 1}`
  };
  mockCustomers.push(customer);
}

// Devices
export const mockDevices: Device[] = [
  {
    id: "dev_0001",
    type: "mikrotik_router",
    model: "RB4011iGS+",
    serial: "ABC12345678",
    mac: "DC:2C:6E:12:34:56",
    ip: "10.0.1.100",
    online: true,
    firmware: "v7.8.1",
    assignedTo: "cust_0001",
    location: { lat: -1.2630, lng: 36.8063 },
    lastSeen: "2025-09-15T12:00:00Z",
    config: {
      template: "home_basic",
      vlan: 100,
      bandwidth: { upload: 2, download: 10 },
      pppoe: { username: "user001", password: "pass001" }
    },
    metrics: {
      cpu: 15,
      memory: 45,
      uptime: 86400000,
      trafficRx: 1024000,
      trafficTx: 512000,
      signalStrength: -65
    }
  },
  {
    id: "dev_0002",
    type: "mikrotik_router",
    model: "RB2011UiAS",
    serial: "DEF87654321",
    mac: "DC:2C:6E:87:65:43",
    ip: "10.0.1.101",
    online: true,
    firmware: "v7.7.2",
    assignedTo: "cust_0002",
    location: { lat: -1.3197, lng: 36.6859 },
    lastSeen: "2025-09-15T11:55:00Z",
    config: {
      template: "home_premium",
      vlan: 200,
      bandwidth: { upload: 5, download: 20 }
    },
    metrics: {
      cpu: 25,
      memory: 38,
      uptime: 172800000,
      trafficRx: 2048000,
      trafficTx: 1024000,
      signalStrength: -58
    }
  },
  {
    id: "dev_0003",
    type: "olt",
    model: "ZTE C320",
    serial: "ZTE98765432",
    mac: "00:0A:0B:0C:0D:0E",
    ip: "10.0.0.10",
    online: false,
    firmware: "v2.1.5",
    location: { lat: -1.3032, lng: 36.8516 },
    lastSeen: "2025-09-15T08:30:00Z",
    metrics: {
      cpu: 85,
      memory: 92,
      uptime: 259200000,
      trafficRx: 10485760,
      trafficTx: 5242880
    }
  }
];

// Generate more devices
for (let i = 4; i <= 150; i++) {
  const device: Device = {
    id: `dev_${String(i).padStart(4, '0')}`,
    type: ['mikrotik_router', 'onu', 'ont'][Math.floor(Math.random() * 3)] as Device['type'],
    model: `Model-${i}`,
    serial: `SN${String(i).padStart(8, '0')}`,
    mac: `DC:2C:6E:${Math.random().toString(16).substr(2, 2).toUpperCase()}:${Math.random().toString(16).substr(2, 2).toUpperCase()}:${Math.random().toString(16).substr(2, 2).toUpperCase()}`,
    ip: `10.0.${Math.floor(i / 256)}.${i % 256}`,
    online: Math.random() > 0.05,
    firmware: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
    assignedTo: i <= mockCustomers.length ? `cust_${String(i).padStart(4, '0')}` : undefined,
    lastSeen: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    metrics: {
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 100),
      uptime: Math.floor(Math.random() * 2592000000),
      trafficRx: Math.floor(Math.random() * 10485760),
      trafficTx: Math.floor(Math.random() * 5242880)
    }
  };
  mockDevices.push(device);
}

// Technicians
export const mockTechnicians: Technician[] = [
  {
    id: "tech_001",
    name: "David Mwangi",
    phone: "+254712001001",
    email: "david.mwangi@noloji.com",
    status: "active",
    currentStatus: "working",
    location: {
      lat: -1.2921,
      lng: 36.8219,
      timestamp: "2025-09-15T12:00:00Z"
    },
    assignedJobs: ["job_001", "job_003"],
    skills: ["fiber_splicing", "router_config", "troubleshooting"],
    performanceScore: 4.8,
    createdAt: "2024-06-01T00:00:00Z"
  },
  {
    id: "tech_002",
    name: "Sarah Wanjiku",
    phone: "+254712001002",
    email: "sarah.wanjiku@noloji.com",
    status: "active",
    currentStatus: "en-route",
    location: {
      lat: -1.2630,
      lng: 36.8063,
      timestamp: "2025-09-15T11:45:00Z"
    },
    assignedJobs: ["job_002"],
    skills: ["installation", "customer_service", "basic_troubleshooting"],
    performanceScore: 4.6,
    createdAt: "2024-07-15T00:00:00Z"
  },
  {
    id: "tech_003",
    name: "Peter Kiprotich",
    phone: "+254712001003",
    email: "peter.kiprotich@noloji.com",
    status: "active",
    currentStatus: "idle",
    location: {
      lat: -1.2921,
      lng: 36.8219,
      timestamp: "2025-09-15T10:30:00Z"
    },
    assignedJobs: [],
    skills: ["olt_management", "fiber_splicing", "advanced_troubleshooting"],
    performanceScore: 4.9,
    createdAt: "2024-05-20T00:00:00Z"
  }
];

// Jobs
export const mockJobs: Job[] = [
  {
    id: "job_001",
    type: "install",
    customerId: "cust_0001",
    technicianId: "tech_001",
    status: "in-progress",
    priority: "medium",
    scheduledAt: "2025-09-15T14:00:00Z",
    location: { lat: -1.2630, lng: 36.8063 },
    description: "Install fiber connection and configure router"
  },
  {
    id: "job_002",
    type: "repair",
    customerId: "cust_0002",
    technicianId: "tech_002",
    status: "assigned",
    priority: "high",
    scheduledAt: "2025-09-15T13:00:00Z",
    location: { lat: -1.3197, lng: 36.6859 },
    description: "Fix intermittent connection issues"
  },
  {
    id: "job_003",
    type: "maintenance",
    customerId: "cust_0003",
    status: "pending",
    priority: "low",
    scheduledAt: "2025-09-16T09:00:00Z",
    location: { lat: -1.3032, lng: 36.8516 },
    description: "Routine maintenance check"
  }
];

// Billing Records
export const mockBillingRecords: BillingRecord[] = [
  {
    id: "bill_001",
    customerId: "cust_0001",
    amount: 3500,
    currency: "KES",
    status: "paid",
    dueDate: "2025-09-01T00:00:00Z",
    paidAt: "2025-09-01T10:30:00Z",
    paymentMethod: "mpesa",
    description: "Monthly subscription - Basic 10 Mbps",
    invoiceNumber: "INV-2025-001"
  },
  {
    id: "bill_002",
    customerId: "cust_0002",
    amount: 5500,
    currency: "KES",
    status: "paid",
    dueDate: "2025-09-05T00:00:00Z",
    paidAt: "2025-09-05T08:15:00Z",
    paymentMethod: "mpesa",
    description: "Monthly subscription - Premium 20 Mbps",
    invoiceNumber: "INV-2025-002"
  },
  {
    id: "bill_003",
    customerId: "cust_0003",
    amount: 12000,
    currency: "KES",
    status: "pending",
    dueDate: "2025-09-15T00:00:00Z",
    description: "Monthly subscription - Business 50 Mbps",
    invoiceNumber: "INV-2025-003"
  }
];

// Hotspots
export const mockHotspots: Hotspot[] = [
  {
    id: "hotspot_001",
    name: "Westgate Mall WiFi",
    location: { lat: -1.2676, lng: 36.8062 },
    ssid: "Noloji_Westgate_Free",
    status: "active",
    captivePortal: {
      enabled: true,
      theme: "westgate_theme",
      loginMethods: ["voucher", "mpesa", "social"],
      redirectUrl: "https://westgate.co.ke"
    },
    activeSessions: 127,
    totalSessions: 15000,
    revenue: 45000,
    deviceId: "dev_hotspot_001"
  },
  {
    id: "hotspot_002",
    name: "Java House Kilimani",
    location: { lat: -1.2884, lng: 36.7847 },
    ssid: "Noloji_JavaHouse_Free",
    status: "active",
    captivePortal: {
      enabled: true,
      theme: "java_theme",
      loginMethods: ["voucher", "social"],
    },
    activeSessions: 45,
    totalSessions: 8500,
    revenue: 28000,
    deviceId: "dev_hotspot_002"
  }
];

// Vouchers
export const mockVouchers: Voucher[] = [
  {
    id: "voucher_001",
    code: "WIFI123456",
    hotspotId: "hotspot_001",
    type: "time",
    value: 120, // 2 hours
    price: 50,
    currency: "KES",
    status: "used",
    createdAt: "2025-09-14T10:00:00Z",
    usedAt: "2025-09-14T14:30:00Z"
  },
  {
    id: "voucher_002",
    code: "DATA789012",
    hotspotId: "hotspot_001",
    type: "data",
    value: 500, // 500 MB
    price: 100,
    currency: "KES",
    status: "active",
    createdAt: "2025-09-15T09:00:00Z",
    expiresAt: "2025-09-22T09:00:00Z"
  }
];

// Fiber Routes
export const mockFiberRoutes: FiberRoute[] = [
  {
    id: "route_001",
    name: "Main Trunk - CBD to Westlands",
    type: "fiber_cable",
    geometry: {
      type: "LineString",
      coordinates: [
        [36.8219, -1.2921], // CBD
        [36.8180, -1.2850],
        [36.8120, -1.2780],
        [36.8063, -1.2630]  // Westlands
      ]
    },
    attributes: {
      coreCount: 48,
      cableType: "SMF G.652",
      installedAt: "2024-03-15T00:00:00Z"
    }
  },
  {
    id: "route_002",
    name: "Westlands Distribution",
    type: "splitter",
    geometry: {
      type: "Point",
      coordinates: [36.8063, -1.2630]
    },
    attributes: {
      splitterRatio: "1:8",
      capacity: 8,
      loss: 10.5
    },
    parentRouteId: "route_001"
  }
];

// Alerts
export const mockAlerts: Alert[] = [
  {
    id: "alert_001",
    type: "device_offline",
    severity: "high",
    title: "Router Offline",
    message: "Device dev_0003 (ZTE C320) has been offline for 3 hours",
    affectedEntity: {
      type: "device",
      id: "dev_0003",
      name: "ZTE C320 - Industrial Area"
    },
    status: "active",
    createdAt: "2025-09-15T08:30:00Z"
  },
  {
    id: "alert_002",
    type: "payment_failed",
    severity: "medium",
    title: "Payment Overdue",
    message: "Customer cust_0003 payment is 15 days overdue",
    affectedEntity: {
      type: "customer",
      id: "cust_0003",
      name: "Mary Johnson"
    },
    status: "active",
    createdAt: "2025-09-14T10:00:00Z"
  },
  {
    id: "alert_003",
    type: "bandwidth_high",
    severity: "low",
    title: "High Bandwidth Usage",
    message: "Network utilization at 85% in Westlands sector",
    affectedEntity: {
      type: "device",
      id: "route_001",
      name: "Main Trunk - CBD to Westlands"
    },
    status: "acknowledged",
    createdAt: "2025-09-15T11:20:00Z",
    acknowledgedAt: "2025-09-15T11:25:00Z"
  }
];

// Export all mock data
export const mockData = {
  users: mockUsers,
  customers: mockCustomers,
  devices: mockDevices,
  technicians: mockTechnicians,
  plans: mockPlans,
  jobs: mockJobs,
  billing: mockBillingRecords,
  hotspots: mockHotspots,
  vouchers: mockVouchers,
  fiberRoutes: mockFiberRoutes,
  alerts: mockAlerts
};