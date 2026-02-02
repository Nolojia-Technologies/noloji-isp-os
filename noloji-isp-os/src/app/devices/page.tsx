"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Router,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Wifi,
  Signal,
  MapPin,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

// Mock data for devices
const mockDevices = [
  {
    id: "DEV-001",
    name: "Main Router - Building A",
    type: "Router",
    model: "UniFi Dream Machine Pro",
    mac: "00:11:22:33:44:55",
    ip: "192.168.1.1",
    location: "Building A - Server Room",
    status: "online",
    uptime: "45 days, 12 hours",
    lastSeen: "Just now",
    firmware: "1.12.30",
    temperature: "42°C"
  },
  {
    id: "DEV-002",
    name: "Access Point - Floor 1",
    type: "Access Point",
    model: "UniFi AP AC Pro",
    mac: "00:11:22:33:44:56",
    ip: "192.168.1.101",
    location: "Building A - Floor 1 Lobby",
    status: "online",
    uptime: "23 days, 8 hours",
    lastSeen: "2 minutes ago",
    firmware: "4.3.28",
    connectedClients: 24
  },
  {
    id: "DEV-003",
    name: "Switch - Core Network",
    type: "Switch",
    model: "UniFi Switch 24 PoE",
    mac: "00:11:22:33:44:57",
    ip: "192.168.1.10",
    location: "Building A - Network Closet",
    status: "warning",
    uptime: "67 days, 3 hours",
    lastSeen: "5 minutes ago",
    firmware: "5.64.8",
    portUtilization: "18/24"
  },
  {
    id: "DEV-004",
    name: "Gateway - Building B",
    type: "Gateway",
    model: "UniFi Security Gateway",
    mac: "00:11:22:33:44:58",
    ip: "192.168.2.1",
    location: "Building B - Main Distribution",
    status: "offline",
    uptime: "N/A",
    lastSeen: "2 hours ago",
    firmware: "4.4.55",
    issue: "Connection timeout"
  }
];

const statusConfig = {
  online: { color: "success", icon: CheckCircle, label: "Online" },
  offline: { color: "destructive", icon: XCircle, label: "Offline" },
  warning: { color: "warning", icon: AlertTriangle, label: "Warning" }
} as const;

const deviceTypeIcons = {
  Router: Router,
  "Access Point": Wifi,
  Switch: Activity,
  Gateway: Signal
} as const;

export default function DevicesPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground">
            Network devices and provisioning management
          </p>
        </div>
        <Button className="flex items-center space-x-2 w-full md:w-auto">
          <Plus className="h-4 w-4" />
          <span>Adopt Device</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">
              +3 devices this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">
              89.4% operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              4.3% down
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Device Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Device Inventory</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                <Input
                  placeholder="Search devices..."
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockDevices.map((device) => {
              const DeviceIcon = deviceTypeIcons[device.type as keyof typeof deviceTypeIcons];
              const StatusIcon = statusConfig[device.status as keyof typeof statusConfig].icon;

              return (
                <div
                  key={device.id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                >
                  <div className="flex items-start md:items-center space-x-4 w-full md:w-auto">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <DeviceIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium truncate">{device.name}</h3>
                        <Badge variant={statusConfig[device.status as keyof typeof statusConfig].color} className="shrink-0">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[device.status as keyof typeof statusConfig].label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{device.model}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="break-all">{device.ip}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Firmware {device.firmware}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{device.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto md:space-x-6 border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                    <div className="text-left md:text-right">
                      <p className="text-sm font-medium">
                        {device.status === 'offline' ? device.issue : `Uptime: ${device.uptime}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last seen: {device.lastSeen}
                      </p>
                      {device.temperature && (
                        <p className="text-sm text-muted-foreground">
                          <Zap className="h-3 w-3 inline mr-1" />
                          {device.temperature}
                        </p>
                      )}
                      {device.connectedClients && (
                        <p className="text-sm text-muted-foreground">
                          {device.connectedClients} clients
                        </p>
                      )}
                      {device.portUtilization && (
                        <p className="text-sm text-muted-foreground">
                          Ports: {device.portUtilization}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Router className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Provision Router</h3>
            <p className="text-sm text-muted-foreground text-center">
              Add new router to network
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Wifi className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Deploy Access Point</h3>
            <p className="text-sm text-muted-foreground text-center">
              Install WiFi access point
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Activity className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Configure Switch</h3>
            <p className="text-sm text-muted-foreground text-center">
              Setup network switch
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <Signal className="h-8 w-8 text-primary" />
            <h3 className="font-medium">Monitor Network</h3>
            <p className="text-sm text-muted-foreground text-center">
              View network topology
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}