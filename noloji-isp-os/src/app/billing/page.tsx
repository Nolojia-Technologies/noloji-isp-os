"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  DollarSign,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download
} from "lucide-react";

// Mock data for invoices
const mockInvoices = [
  {
    id: "INV-2024-001",
    customerName: "John Anderson",
    customerId: "CUST-001",
    amount: 89.99,
    dueDate: "2024-01-15",
    issueDate: "2024-01-01",
    status: "paid",
    plan: "Fiber Pro 100",
    paymentMethod: "Auto-pay (Credit Card)",
    late: false
  },
  {
    id: "INV-2024-002",
    customerName: "Sarah Wilson",
    customerId: "CUST-002",
    amount: 149.99,
    dueDate: "2024-01-20",
    issueDate: "2024-01-05",
    status: "pending",
    plan: "Business 200",
    paymentMethod: "Bank Transfer",
    late: false
  },
  {
    id: "INV-2024-003",
    customerName: "Mike Johnson",
    customerId: "CUST-003",
    amount: 49.99,
    dueDate: "2024-01-10",
    issueDate: "2023-12-28",
    status: "overdue",
    plan: "Basic 50",
    paymentMethod: "Manual Payment",
    late: true,
    daysOverdue: 12
  },
  {
    id: "INV-2024-004",
    customerName: "Emily Davis",
    customerId: "CUST-004",
    amount: 89.99,
    dueDate: "2024-01-25",
    issueDate: "2024-01-10",
    status: "pending",
    plan: "Fiber Pro 100",
    paymentMethod: "Auto-pay (Credit Card)",
    late: false
  }
];

const statusConfig = {
  paid: { color: "success", icon: CheckCircle, label: "Paid" },
  pending: { color: "warning", icon: Clock, label: "Pending" },
  overdue: { color: "destructive", icon: AlertCircle, label: "Overdue" }
} as const;

export default function BillingPage() {
  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = mockInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = mockInvoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = mockInvoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
            <p className="text-muted-foreground">
              Invoices, payments, and revenue management
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
            </Button>
          </div>
        </div>

        {/* Revenue Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                +8.2% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${paidAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((paidAmount / totalRevenue) * 100)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {mockInvoices.filter(inv => inv.status === 'pending').length} invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${overdueAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Revenue Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2">
                <TrendingUp className="h-12 w-12 text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Revenue Chart</p>
                <p className="text-xs text-muted-foreground">Monthly revenue and growth visualization</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Invoices</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                  <Input
                    placeholder="Search invoices..."
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
              {mockInvoices.map((invoice) => {
                const StatusIcon = statusConfig[invoice.status as keyof typeof statusConfig].icon;

                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{invoice.id}</h3>
                          <Badge variant={statusConfig[invoice.status as keyof typeof statusConfig].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[invoice.status as keyof typeof statusConfig].label}
                          </Badge>
                          {invoice.late && (
                            <Badge variant="destructive">
                              {invoice.daysOverdue} days late
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{invoice.customerName}</span>
                          <span>•</span>
                          <span>{invoice.plan}</span>
                          <span>•</span>
                          <span>{invoice.paymentMethod}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Issued: {invoice.issueDate}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {invoice.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-lg font-bold">${invoice.amount}</p>
                        <p className="text-sm text-muted-foreground">
                          Customer #{invoice.customerId.split('-')[1]}
                        </p>
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
              <Plus className="h-8 w-8 text-primary" />
              <h3 className="font-medium">Generate Invoice</h3>
              <p className="text-sm text-muted-foreground text-center">
                Create new customer invoice
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
              <CreditCard className="h-8 w-8 text-primary" />
              <h3 className="font-medium">Process Payment</h3>
              <p className="text-sm text-muted-foreground text-center">
                Manual payment entry
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
              <AlertCircle className="h-8 w-8 text-primary" />
              <h3 className="font-medium">Overdue Notices</h3>
              <p className="text-sm text-muted-foreground text-center">
                Send payment reminders
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
              <Download className="h-8 w-8 text-primary" />
              <h3 className="font-medium">Export Reports</h3>
              <p className="text-sm text-muted-foreground text-center">
                Financial reports and data
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}