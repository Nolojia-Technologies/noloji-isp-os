"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Box,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  TrendingDown,
  MapPin,
  Calendar
} from "lucide-react";

// Mock data for inventory items
const mockInventory = [
  {
    id: "INV-001",
    name: "UniFi Dream Machine Pro",
    category: "Router",
    sku: "UDM-PRO",
    inStock: 12,
    lowStockThreshold: 5,
    totalValue: 4788.00,
    unitCost: 399.00,
    supplier: "Ubiquiti Networks",
    location: "Warehouse A - Shelf 3",
    lastRestocked: "2024-01-15",
    status: "in-stock"
  },
  {
    id: "INV-002",
    name: "UniFi AP AC Pro",
    category: "Access Point",
    sku: "UAP-AC-PRO",
    inStock: 25,
    lowStockThreshold: 10,
    totalValue: 3975.00,
    unitCost: 159.00,
    supplier: "Ubiquiti Networks",
    location: "Warehouse A - Shelf 1",
    lastRestocked: "2024-01-10",
    status: "in-stock"
  },
  {
    id: "INV-003",
    name: "Fiber Optic Cable (1000m)",
    category: "Cable",
    sku: "FOC-1000M",
    inStock: 3,
    lowStockThreshold: 5,
    totalValue: 1347.00,
    unitCost: 449.00,
    supplier: "CoreLink Solutions",
    location: "Warehouse B - Zone 2",
    lastRestocked: "2023-12-20",
    status: "low-stock"
  },
  {
    id: "INV-004",
    name: "ONT Device - GPON",
    category: "ONT",
    sku: "ONT-GPON-4P",
    inStock: 0,
    lowStockThreshold: 8,
    totalValue: 0.00,
    unitCost: 89.00,
    supplier: "FiberLink Tech",
    location: "Warehouse A - Shelf 2",
    lastRestocked: "2023-11-30",
    status: "out-of-stock"
  },
  {
    id: "INV-005",
    name: "Cat6 Ethernet Cable (305m)",
    category: "Cable",
    sku: "CAT6-305M",
    inStock: 8,
    lowStockThreshold: 3,
    totalValue: 1592.00,
    unitCost: 199.00,
    supplier: "NetworkCable Plus",
    location: "Warehouse B - Zone 1",
    lastRestocked: "2024-01-08",
    status: "in-stock"
  }
];

const statusConfig = {
  "in-stock": { color: "success", icon: CheckCircle, label: "In Stock" },
  "low-stock": { color: "warning", icon: AlertTriangle, label: "Low Stock" },
  "out-of-stock": { color: "destructive", icon: XCircle, label: "Out of Stock" }
} as const;

export default function InventoryPage() {
  const totalValue = mockInventory.reduce((sum, item) => sum + item.totalValue, 0);
  const totalItems = mockInventory.reduce((sum, item) => sum + item.inStock, 0);
  const lowStockItems = mockInventory.filter(item => item.status === 'low-stock').length;
  const outOfStockItems = mockInventory.filter(item => item.status === 'out-of-stock').length;

  return (
    <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
            <p className="text-muted-foreground">
              Asset and inventory tracking for network equipment
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Reports</span>
            </Button>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total inventory value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Items in Stock</CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Across {mockInventory.length} SKUs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems}</div>
              <p className="text-xs text-muted-foreground">
                Items need restocking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">
                Urgent restock needed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Equipment Inventory</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                  <Input
                    placeholder="Search inventory..."
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
              {mockInventory.map((item) => {
                const StatusIcon = statusConfig[item.status as keyof typeof statusConfig].icon;
                const stockPercentage = Math.round((item.inStock / (item.lowStockThreshold * 2)) * 100);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{item.name}</h3>
                          <Badge variant={statusConfig[item.status as keyof typeof statusConfig].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[item.status as keyof typeof statusConfig].label}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>SKU: {item.sku}</span>
                          <span>•</span>
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>{item.supplier}</span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{item.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Last restocked: {item.lastRestocked}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-lg font-bold">{item.inStock}</p>
                        <p className="text-xs text-muted-foreground">In Stock</p>
                        <p className="text-xs text-muted-foreground">
                          Min: {item.lowStockThreshold}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-medium">${item.unitCost}</p>
                        <p className="text-xs text-muted-foreground">Unit Cost</p>
                        <p className="text-sm font-medium">${item.totalValue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total Value</p>
                      </div>

                      <div className="w-20">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.status === 'out-of-stock' ? 'bg-destructive' :
                              item.status === 'low-stock' ? 'bg-warning' : 'bg-success'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(5, stockPercentage))}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground mt-1">
                          Stock Level
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
              <h3 className="font-medium">Add Equipment</h3>
              <p className="text-sm text-muted-foreground text-center">
                Register new inventory item
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
              <Package className="h-8 w-8 text-primary" />
              <h3 className="font-medium">Restock Items</h3>
              <p className="text-sm text-muted-foreground text-center">
                Order low stock items
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h3 className="font-medium">Inventory Report</h3>
              <p className="text-sm text-muted-foreground text-center">
                Generate stock reports
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
              <AlertTriangle className="h-8 w-8 text-primary" />
              <h3 className="font-medium">Low Stock Alerts</h3>
              <p className="text-sm text-muted-foreground text-center">
                Configure notifications
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}