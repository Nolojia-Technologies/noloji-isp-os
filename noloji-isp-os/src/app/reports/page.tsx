"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Plus,
  Filter,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Clock,
  Eye
} from "lucide-react";

// Mock data for reports
const mockReports = [
  {
    id: "RPT-001",
    name: "Monthly Revenue Report",
    type: "Financial",
    description: "Comprehensive revenue analysis and billing statistics",
    lastGenerated: "2024-01-22",
    frequency: "Monthly",
    format: "PDF",
    size: "2.4 MB",
    status: "ready",
    category: "revenue"
  },
  {
    id: "RPT-002",
    name: "Customer Growth Analysis",
    type: "Customer",
    description: "Customer acquisition, churn, and retention metrics",
    lastGenerated: "2024-01-21",
    frequency: "Weekly",
    format: "Excel",
    size: "1.8 MB",
    status: "ready",
    category: "customer"
  },
  {
    id: "RPT-003",
    name: "Network Performance Dashboard",
    type: "Technical",
    description: "Uptime, latency, and bandwidth utilization analysis",
    lastGenerated: "2024-01-22",
    frequency: "Daily",
    format: "PDF",
    size: "3.2 MB",
    status: "ready",
    category: "network"
  },
  {
    id: "RPT-004",
    name: "Equipment Inventory Summary",
    type: "Inventory",
    description: "Stock levels, procurement needs, and asset tracking",
    lastGenerated: "2024-01-20",
    frequency: "Weekly",
    format: "Excel",
    size: "1.1 MB",
    status: "generating",
    category: "inventory"
  },
  {
    id: "RPT-005",
    name: "Technician Performance Review",
    type: "Operations",
    description: "Field team productivity and job completion metrics",
    lastGenerated: "2024-01-19",
    frequency: "Monthly",
    format: "PDF",
    size: "1.9 MB",
    status: "ready",
    category: "operations"
  }
];

const quickReports = [
  {
    title: "Revenue Summary",
    description: "Quick financial overview",
    icon: DollarSign,
    category: "Financial",
    estimatedTime: "30 seconds"
  },
  {
    title: "Customer Analytics",
    description: "User growth and retention",
    icon: Users,
    category: "Customer",
    estimatedTime: "45 seconds"
  },
  {
    title: "Network Health",
    description: "System performance metrics",
    icon: Activity,
    category: "Technical",
    estimatedTime: "1 minute"
  },
  {
    title: "Service Level Report",
    description: "SLA compliance and uptime",
    icon: TrendingUp,
    category: "Operations",
    estimatedTime: "2 minutes"
  }
];

const statusConfig = {
  ready: { color: "success", label: "Ready" },
  generating: { color: "warning", label: "Generating" },
  failed: { color: "destructive", label: "Failed" }
} as const;

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Business intelligence and analytics reporting
            </p>
          </div>
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Report</span>
          </Button>
        </div>

        {/* Report Categories */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockReports.length}</div>
              <p className="text-xs text-muted-foreground">
                Available for download
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Automated reports
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Generated Today</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                Fresh analytics
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47.3 MB</div>
              <p className="text-xs text-muted-foreground">
                Storage used
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickReports.map((report, index) => {
                const Icon = report.icon;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center space-y-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Icon className="h-8 w-8 text-primary" />
                    <div className="text-center">
                      <h3 className="font-medium">{report.title}</h3>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {report.category}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{report.estimatedTime}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Generated Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Reports</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                  <Input
                    placeholder="Search reports..."
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
              {mockReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{report.name}</h3>
                        <Badge variant={statusConfig[report.status as keyof typeof statusConfig].color}>
                          {statusConfig[report.status as keyof typeof statusConfig].label}
                        </Badge>
                        <Badge variant="outline">
                          {report.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Generated: {report.lastGenerated}</span>
                        </div>
                        <span>•</span>
                        <span>{report.frequency}</span>
                        <span>•</span>
                        <span>{report.format}</span>
                        <span>•</span>
                        <span>{report.size}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Report Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-3 p-6 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <PieChart className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <h3 className="font-medium">Revenue Breakdown</h3>
                  <p className="text-sm text-muted-foreground">Service revenue by category</p>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-3 p-6 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <LineChart className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <h3 className="font-medium">Growth Trends</h3>
                  <p className="text-sm text-muted-foreground">Customer and revenue trends</p>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-3 p-6 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <h3 className="font-medium">Performance Metrics</h3>
                  <p className="text-sm text-muted-foreground">KPI dashboard and metrics</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}