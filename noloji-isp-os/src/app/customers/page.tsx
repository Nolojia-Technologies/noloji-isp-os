'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { supabaseCustomerApi } from '@/lib/supabase-api';
import { CustomerActions } from '@/components/mikrotik/CustomerActions';
import { toast } from '@/components/ui/use-toast';
import {
  Users, Search, Plus, UserCheck, UserX,
  Wifi, Cable, Calendar, Package, RefreshCw, Download, Trash2
} from 'lucide-react';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'HOTSPOT' | 'PPPOE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [filter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);

      const response = await supabaseCustomerApi.getAll({
        limit: 100,
        search: searchTerm || undefined,
      });

      let filtered = response.data;
      if (filter !== 'ALL') {
        filtered = filtered.filter(c =>
          c.connection_type?.toUpperCase() === filter
        );
      }

      setCustomers(filtered);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load customers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadCustomers();
  };

  const getActivityStatus = (customer: any) => {
    return customer.is_online ? 'Online' : 'Offline';
  };

  const getAccountStatus = (customer: any) => {
    if (!customer.is_active) return 'Inactive';
    if (customer.status === 'EXPIRED') return 'Expired';
    return 'Active';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const filterStats = {
    all: customers.length,
    hotspot: customers.filter(c => c.connection_type === 'HOTSPOT').length,
    pppoe: customers.filter(c => c.connection_type === 'PPPOE').length,
    online: customers.filter(c => c.is_online).length
  };

  const syncOnlineStatus = async () => {
    try {
      setSyncing(true);
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
      const response = await fetch(`${mikrotikServiceUrl}/api/customers/sync-online-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Status Synced',
          description: result.message
        });
        loadCustomers(); // Reload to show updated status
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Could not connect to MikroTik service',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const importFromMikroTik = async () => {
    try {
      setImporting(true);
      const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
      const response = await fetch(`${mikrotikServiceUrl}/api/customers/import-from-mikrotik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Import Complete',
          description: result.message
        });
        loadCustomers(); // Reload to show imported users
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Could not connect to MikroTik service',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your ISP customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importFromMikroTik} disabled={importing}>
            <Download className={`w-4 h-4 mr-2 ${importing ? 'animate-pulse' : ''}`} />
            {importing ? 'Importing...' : 'Import from MikroTik'}
          </Button>
          <Button variant="outline" onClick={syncOnlineStatus} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Status'}
          </Button>
          <Button onClick={() => router.push('/customers/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <div className="text-2xl font-bold">{filterStats.all}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Hotspot</span>
          </div>
          <div className="text-2xl font-bold">{filterStats.hotspot}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Cable className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">PPPOE</span>
          </div>
          <div className="text-2xl font-bold">{filterStats.pppoe}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">Online</span>
          </div>
          <div className="text-2xl font-bold">{filterStats.online}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            <Button
              variant={filter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setFilter('ALL')}
            >
              All
            </Button>
            <Button
              variant={filter === 'HOTSPOT' ? 'default' : 'outline'}
              onClick={() => setFilter('HOTSPOT')}
            >
              <Wifi className="w-4 h-4 mr-1" />
              Hotspot
            </Button>
            <Button
              variant={filter === 'PPPOE' ? 'default' : 'outline'}
              onClick={() => setFilter('PPPOE')}
            >
              <Cable className="w-4 h-4 mr-1" />
              PPPOE
            </Button>
          </div>

          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search by name, username, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </div>
      </Card>

      {/* Customers Table */}
      {loading ? (
        <div className="text-center py-8">Loading customers...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-background z-10 shadow-sm">
                <tr className="border-b">
                  <th className="text-left p-4 font-medium bg-background">Username</th>
                  <th className="text-left p-4 font-medium bg-background">Name</th>
                  <th className="text-left p-4 font-medium bg-background">Phone</th>
                  <th className="text-left p-4 font-medium bg-background">Type</th>
                  <th className="text-left p-4 font-medium bg-background">Activity</th>
                  <th className="text-left p-4 font-medium bg-background">Status</th>
                  <th className="text-left p-4 font-medium bg-background">Package</th>
                  <th className="text-left p-4 font-medium bg-background">Expiry</th>
                  <th className="text-left p-4 font-medium bg-background">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b hover:bg-primary/10 cursor-pointer transition-colors duration-150"
                      onClick={() => router.push(`/customers/${customer.id}`)}
                    >
                      <td className="p-4">
                        <div className="font-medium">{customer.username}</div>
                      </td>
                      <td className="p-4">{customer.full_name || 'N/A'}</td>
                      <td className="p-4">{customer.phone || 'N/A'}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {customer.connection_type === 'HOTSPOT' ? (
                            <Wifi className="w-3 h-3" />
                          ) : (
                            <Cable className="w-3 h-3" />
                          )}
                          {customer.connection_type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-medium ${customer.is_online
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                        >
                          {customer.is_online ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {getActivityStatus(customer)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 text-xs rounded ${getAccountStatus(customer) === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : getAccountStatus(customer) === 'Expired'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                          {getAccountStatus(customer)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-muted-foreground" />
                          {customer.plans?.name || 'No Plan'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {formatDate(customer.valid_until)}
                        </div>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <CustomerActions
                            customerId={customer.id}
                            customerName={customer.username}
                            isActive={customer.is_active}
                            onStatusChange={loadCustomers}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/customers/${customer.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleting === customer.id}
                            onClick={async () => {
                              if (!confirm(`Delete ${customer.username}?`)) return;
                              setDeleting(customer.id);
                              try {
                                // Delete from MikroTik first
                                const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
                                await fetch(`${mikrotikServiceUrl}/api/customers/${customer.id}/remove-from-mikrotik`, {
                                  method: 'DELETE'
                                });
                                // Delete from database
                                await supabase.from('customers').delete().eq('id', customer.id);
                                toast({ title: 'Deleted', description: `${customer.username} deleted` });
                                loadCustomers();
                              } catch (e: any) {
                                toast({ title: 'Error', description: e.message, variant: 'destructive' });
                              } finally {
                                setDeleting(null);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
