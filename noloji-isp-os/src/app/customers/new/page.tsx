'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { supabasePlanApi } from '@/lib/supabase-api';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    id_number: '',
    connection_type: 'HOTSPOT',
    router_id: '',
    plan_id: '',
    valid_until: '',
    mac_address: '',
    notes: ''
  });

  useEffect(() => {
    loadPlansAndRouters();
  }, []);

  const loadPlansAndRouters = async () => {
    try {
      const [plansData, routersResponse] = await Promise.all([
        supabasePlanApi.getAll(),
        supabase.from('routers').select('*').eq('is_active', true).order('name')
      ]);

      setPlans(plansData || []);
      setRouters(routersResponse.data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load plans and routers',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.username || !formData.password) {
      toast({
        title: 'Validation Error',
        description: 'Username and password are required',
        variant: 'destructive'
      });
      return;
    }

    if (formData.connection_type === 'HOTSPOT' && !formData.router_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select a router for hotspot users',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        username: formData.username,
        password: formData.password,
        connection_type: formData.connection_type,
        is_active: true,
        is_online: false
      };

      // Add optional fields if provided
      if (formData.full_name) payload.full_name = formData.full_name;
      if (formData.email) payload.email = formData.email;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.address) payload.address = formData.address;
      if (formData.id_number) payload.id_number = formData.id_number;
      if (formData.plan_id) payload.plan_id = parseInt(formData.plan_id);
      if (formData.router_id) payload.router_id = parseInt(formData.router_id);
      if (formData.valid_until) payload.valid_until = formData.valid_until;
      if (formData.mac_address) payload.mac_address = formData.mac_address;
      if (formData.notes) payload.notes = formData.notes;

      // Create customer in database
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Try to sync to MikroTik (for both HOTSPOT and PPPOE customers with router assigned)
      let mikrotikSynced = false;
      if (formData.router_id && formData.plan_id) {
        try {
          const mikrotikServiceUrl = process.env.NEXT_PUBLIC_MIKROTIK_URL || 'http://localhost:3002';
          const syncResponse = await fetch(`${mikrotikServiceUrl}/api/customers/${newCustomer.id}/provision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (syncResponse.ok) {
            const result = await syncResponse.json();
            mikrotikSynced = result.success;
          }
        } catch (syncError) {
          console.log('MikroTik sync skipped:', syncError);
        }
      }

      let message = 'Customer created successfully';
      if (mikrotikSynced) {
        message += ' and synced to MikroTik router';
      }

      toast({
        title: 'Success',
        description: message
      });

      // Redirect to customers page
      setTimeout(() => router.push('/customers'), 1500);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create customer',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate default expiry date (30 days from now)
  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Add New Customer</h1>
            <p className="text-muted-foreground">
              Create a new customer account - Hotspot users will be automatically synced to MikroTik
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded"></div>
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g., user001"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded"></div>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254700000000"
                />
              </div>

              <div>
                <Label htmlFor="id_number">ID Number</Label>
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  placeholder="12345678"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street, City"
                />
              </div>
            </div>
          </div>

          {/* Connection Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded"></div>
              Connection Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="connection_type">
                  Connection Type <span className="text-red-500">*</span>
                </Label>
                <select
                  id="connection_type"
                  value={formData.connection_type}
                  onChange={(e) => setFormData({ ...formData, connection_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  required
                >
                  <option value="HOTSPOT">Hotspot</option>
                  <option value="PPPOE">PPPOE</option>
                </select>
              </div>

              <div>
                <Label htmlFor="router_id">
                  Router {formData.connection_type === 'HOTSPOT' && <span className="text-red-500">*</span>}
                </Label>
                <select
                  id="router_id"
                  value={formData.router_id}
                  onChange={(e) => setFormData({ ...formData, router_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  required={formData.connection_type === 'HOTSPOT'}
                >
                  <option value="">Select Router</option>
                  {routers.map((router) => (
                    <option key={router.id} value={router.id}>
                      {router.name} ({router.host})
                    </option>
                  ))}
                </select>
                {formData.connection_type === 'HOTSPOT' && !formData.router_id && (
                  <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Router is required for Hotspot users to sync with MikroTik
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="plan_id">Service Plan</Label>
                <select
                  id="plan_id"
                  value={formData.plan_id}
                  onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">No Plan (Pay as you go)</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.download_speed}Mbps ({plan.price} {plan.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  placeholder={getDefaultExpiryDate()}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for unlimited validity
                </p>
              </div>

              <div>
                <Label htmlFor="mac_address">MAC Address</Label>
                <Input
                  id="mac_address"
                  value={formData.mac_address}
                  onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                  placeholder="00:11:22:33:44:55"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this customer..."
              className="w-full h-24 px-3 py-2 rounded-md border border-input bg-background resize-none"
            />
          </div>

          {/* Info Box */}
          {formData.connection_type === 'HOTSPOT' && formData.router_id && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">MikroTik Integration Enabled</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    This customer will be automatically created in your MikroTik router ({routers.find(r => r.id.toString() === formData.router_id)?.name}).
                    You'll be able to see them in Winbox under IP → Hotspot → Users.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={loading}
              className="min-w-32"
            >
              {loading ? (
                <>Creating...</>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Customer
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
