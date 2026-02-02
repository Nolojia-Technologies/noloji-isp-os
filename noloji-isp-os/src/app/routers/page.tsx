'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { mikrotikApi } from '@/lib/mikrotik-api';
import { toast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Router, MapPin, Activity, Users, HelpCircle, BookOpen, CheckCircle, ChevronDown, ChevronUp, Cpu, HardDrive, Clock, RefreshCw, Wifi, Cable, Stethoscope, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RoutersPage() {
  const [routers, setRouters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [editingRouter, setEditingRouter] = useState<any>(null);
  const [diagnosing, setDiagnosing] = useState<number | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [showScripts, setShowScripts] = useState<number | null>(null);
  const [setupScripts, setSetupScripts] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    api_port: '8728',
    api_username: 'admin',
    api_password: '',
    nas_identifier: '',
    radius_secret: '',
    location: '',
    role: 'hotspot',
    connection_mode: 'radius', // Default to RADIUS mode for new routers
    is_active: true
  });

  useEffect(() => {
    loadRouters();
  }, []);

  const loadRouters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('routers')
        .select('*')
        .order('name');

      if (error) throw error;
      setRouters(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load routers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshRouterStatus = async (routerId: number) => {
    try {
      const resources = await mikrotikApi.getRouterResources(routerId);
      if (resources) {
        const memPercent = Math.round(
          ((resources.totalMemory - resources.freeMemory) / resources.totalMemory) * 100
        );
        setRouters(prev => prev.map(r => {
          if (r.id === routerId) {
            return { ...r, status: 'online', cpu_usage: resources.cpuLoad, memory_usage: memPercent, uptime: resources.uptime };
          }
          return r;
        }));
        toast({ title: 'Success', description: 'Router status updated' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to check router status', variant: 'destructive' });
    }
  };

  const diagnoseRouter = async (routerId: number) => {
    try {
      setDiagnosing(routerId);
      setDiagnosticResult(null);
      toast({ title: 'Diagnosing...', description: 'Running connection diagnostics, this may take a few seconds' });

      const result = await mikrotikApi.diagnoseRouterConnection(routerId);
      setDiagnosticResult(result);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Diagnosis failed', variant: 'destructive' });
      setDiagnosticResult({ error: error.message, details: ['Failed to run diagnostics'] });
    }
  };

  const closeDiagnostics = () => {
    setDiagnosing(null);
    setDiagnosticResult(null);
  };

  const loadSetupScripts = async (routerId: number) => {
    try {
      setShowScripts(routerId);
      setSetupScripts(null);
      toast({ title: 'Loading...', description: 'Generating setup scripts' });

      const result = await mikrotikApi.getSetupScripts(routerId);
      setSetupScripts(result);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load scripts', variant: 'destructive' });
      setSetupScripts({ error: error.message });
    }
  };

  const closeScripts = () => {
    setShowScripts(null);
    setSetupScripts(null);
  };

  const copyToClipboard = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${name} copied to clipboard` });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload: any = {
        name: formData.name,
        host: formData.host,
        api_port: parseInt(formData.api_port) || 8728,
        api_username: formData.api_username,
        nas_identifier: formData.nas_identifier || null,
        location: formData.location || null,
        role: formData.role,
        is_active: formData.is_active
      };

      // Only include password fields if they're provided
      if (formData.api_password) {
        payload.api_password = formData.api_password;
      }
      if (formData.radius_secret) {
        payload.radius_secret = formData.radius_secret;
      }

      if (editingRouter) {
        const { error } = await supabase
          .from('routers')
          .update(payload)
          .eq('id', editingRouter.id);
        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Router updated successfully'
        });
      } else {
        const { error } = await supabase
          .from('routers')
          .insert(payload);
        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Router added successfully'
        });
      }

      resetForm();
      loadRouters();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Operation failed',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (router: any) => {
    setEditingRouter(router);
    setFormData({
      name: router.name || '',
      host: router.host || '',
      api_port: router.api_port?.toString() || '8728',
      api_username: router.api_username || 'admin',
      api_password: '', // Don't show password
      nas_identifier: router.nas_identifier || '',
      radius_secret: '', // Don't show secret
      location: router.location || '',
      role: router.role || 'hotspot',
      is_active: router.is_active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this router?')) return;

    try {
      const { error } = await supabase
        .from('routers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Router deleted successfully'
      });
      loadRouters();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete router',
        variant: 'destructive'
      });
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('routers')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      toast({
        title: 'Success',
        description: `Router ${!currentStatus ? 'activated' : 'deactivated'}`
      });
      loadRouters();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      api_port: '8728',
      api_username: 'admin',
      api_password: '',
      nas_identifier: '',
      radius_secret: '',
      location: '',
      role: 'hotspot',
      is_active: true
    });
    setEditingRouter(null);
    setShowForm(false);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Routers</h1>
          <p className="text-muted-foreground">Manage MikroTik routers and integration</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button onClick={() => setShowGuide(!showGuide)} variant="outline" className="flex-1 md:flex-none">
            <BookOpen className="w-4 h-4 mr-2" />
            Setup Guide
          </Button>
          <Button onClick={() => setShowForm(true)} disabled={loading} className="flex-1 md:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            Add Router
          </Button>
        </div>
      </div>

      {/* Diagnostic Modal */}
      {diagnosing !== null && diagnosticResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Connection Diagnostics</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={closeDiagnostics}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Router Info */}
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Router:</span> <strong>{diagnosticResult.routerName}</strong></div>
                  <div><span className="text-muted-foreground">Host:</span> <strong>{diagnosticResult.host}:{diagnosticResult.port}</strong></div>
                  <div><span className="text-muted-foreground">Username:</span> <strong>{diagnosticResult.username}</strong></div>
                  <div><span className="text-muted-foreground">Password:</span> <strong>{diagnosticResult.passwordProvided ? '••••••••' : '(not set)'}</strong></div>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex gap-4 mb-4">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${diagnosticResult.portOpen ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                  {diagnosticResult.portOpen ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  Port Open
                </div>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${diagnosticResult.authenticated ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                  {diagnosticResult.authenticated ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  Authenticated
                </div>
                {diagnosticResult.latencyMs && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <Clock className="w-4 h-4" />
                    {diagnosticResult.latencyMs}ms
                  </div>
                )}
              </div>

              {diagnosticResult.identity && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded-lg mb-4">
                  <strong>Router Identity:</strong> {diagnosticResult.identity}
                </div>
              )}

              {diagnosticResult.error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 rounded-lg mb-4">
                  <strong>Error:</strong> {diagnosticResult.error}
                </div>
              )}

              {/* Detailed logs */}
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
                <div className="text-gray-400 mb-2">Diagnostic Log:</div>
                {diagnosticResult.details?.map((detail: string, i: number) => (
                  <div key={i} className={`${detail.startsWith('✓') ? 'text-green-400' : detail.startsWith('❌') ? 'text-red-400' : detail.startsWith('⚠') ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {detail}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={closeDiagnostics}>Close</Button>
                <Button variant="outline" onClick={() => diagnoseRouter(diagnosing)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-run Diagnostics
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Setup Scripts Modal */}
      {showScripts !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Router Setup Scripts</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={closeScripts}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {!setupScripts && (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Generating scripts...
                </div>
              )}

              {setupScripts?.error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <strong>Error:</strong> {setupScripts.error}
                </div>
              )}

              {setupScripts?.scripts && (
                <>
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                    <div className="text-sm mb-2">
                      <strong>Router:</strong> {setupScripts.routerName}
                    </div>
                    <div className="text-sm mb-2">
                      <strong>Service URL:</strong> {setupScripts.serviceUrl}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      These scripts configure your MikroTik router to connect to Nolojia Billing.
                      Run them in your router's terminal (Winbox → New Terminal).
                    </div>
                  </div>

                  {/* Full Setup Script */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-green-600">📋 Full Setup Script (Recommended)</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(setupScripts.scripts.fullSetupScript, 'Full Setup Script')}
                      >
                        Copy
                      </Button>
                    </div>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-60">
                      <pre className="whitespace-pre-wrap">{setupScripts.scripts.fullSetupScript}</pre>
                    </div>
                  </div>

                  {/* Individual Scripts Accordion */}
                  <details className="mb-4">
                    <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                      View Individual Scripts
                    </summary>

                    <div className="mt-4 space-y-4">
                      {/* RADIUS Script */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">RADIUS Configuration</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(setupScripts.scripts.radiusScript, 'RADIUS Script')}
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="bg-gray-800 text-gray-200 p-3 rounded font-mono text-xs overflow-x-auto max-h-40">
                          <pre className="whitespace-pre-wrap">{setupScripts.scripts.radiusScript}</pre>
                        </div>
                      </div>

                      {/* Heartbeat Script */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Heartbeat Script</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(setupScripts.scripts.heartbeatScript, 'Heartbeat Script')}
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="bg-gray-800 text-gray-200 p-3 rounded font-mono text-xs overflow-x-auto max-h-40">
                          <pre className="whitespace-pre-wrap">{setupScripts.scripts.heartbeatScript}</pre>
                        </div>
                      </div>

                      {/* Active Users Script */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Active Users Sync Script</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(setupScripts.scripts.activeUsersScript, 'Active Users Script')}
                          >
                            Copy
                          </Button>
                        </div>
                        <div className="bg-gray-800 text-gray-200 p-3 rounded font-mono text-xs overflow-x-auto max-h-40">
                          <pre className="whitespace-pre-wrap">{setupScripts.scripts.activeUsersScript}</pre>
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Instructions */}
                  <details className="mb-4">
                    <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                      📖 Setup Instructions
                    </summary>
                    <div className="mt-2 bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                      {setupScripts.scripts.instructions}
                    </div>
                  </details>
                </>
              )}

              <div className="flex gap-2 mt-4">
                <Button onClick={closeScripts}>Close</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showGuide && (
        <Card className="p-6 mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold">MikroTik Router Setup Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowGuide(false)}>
              <ChevronUp className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Prerequisites */}
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Prerequisites
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                <li>MikroTik router with RouterOS 6.x or 7.x</li>
                <li>Network access to the router's IP address</li>
                <li>Admin credentials for the router</li>
                <li>API service enabled on the router (port 8728)</li>
              </ul>
            </div>

            {/* Step 1: Enable API */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Step 1: Enable MikroTik API</h3>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-2 text-sm">
                <p className="font-medium">Connect to your MikroTik router via Winbox or WebFig:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Navigate to <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">IP → Services</code></li>
                  <li>Find <strong>api</strong> service in the list</li>
                  <li>Double-click to open settings</li>
                  <li>Ensure it's enabled and listening on port <strong>8728</strong></li>
                  <li>Click OK to save</li>
                </ol>
              </div>
            </div>

            {/* Step 2: Create API User */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Step 2: Create API User (Recommended)</h3>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-2 text-sm">
                <p className="text-muted-foreground">For security, create a dedicated user for API access:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Go to <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">System → Users</code></li>
                  <li>Click the <strong>+</strong> button to add a new user</li>
                  <li>Enter name: <strong>noloji-api</strong></li>
                  <li>Set a strong password</li>
                  <li>Group: <strong>full</strong> or <strong>write</strong></li>
                  <li>Click OK to create</li>
                </ol>
              </div>
            </div>

            {/* Step 3: Configure RADIUS */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Step 3: Configure RADIUS Server</h3>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-2 text-sm">
                <p className="font-medium">Add this system as a RADIUS server on your MikroTik:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Go to <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">RADIUS</code> menu</li>
                  <li>Click <strong>+</strong> to add a new RADIUS server</li>
                  <li>Address: <strong>Your Server IP</strong> (where this system is running)</li>
                  <li>Secret: Enter a strong shared secret (you'll use this when adding the router here)</li>
                  <li>Service: Select <strong>hotspot</strong>, <strong>ppp</strong>, or both depending on your setup</li>
                  <li>Timeout: <strong>3000ms</strong></li>
                  <li>Click OK to save</li>
                </ol>
              </div>
            </div>

            {/* Step 4: Add Router */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Step 4: Add Router to Noloji System</h3>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-3 text-sm">
                <p className="font-medium">Click the "Add Router" button above and fill in:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <strong>Router Name:</strong>
                    <p className="text-muted-foreground">Friendly name (e.g., "Main Office Router")</p>
                  </div>
                  <div>
                    <strong>IP Address/Host:</strong>
                    <p className="text-muted-foreground">Router's IP address (e.g., 192.168.88.1)</p>
                  </div>
                  <div>
                    <strong>API Port:</strong>
                    <p className="text-muted-foreground">Default is 8728 (don't change unless modified)</p>
                  </div>
                  <div>
                    <strong>API Username:</strong>
                    <p className="text-muted-foreground">Use "admin" or the dedicated user you created</p>
                  </div>
                  <div>
                    <strong>API Password:</strong>
                    <p className="text-muted-foreground">Password for the API user</p>
                  </div>
                  <div>
                    <strong>NAS Identifier:</strong>
                    <p className="text-muted-foreground">Unique ID for this router (e.g., "mikrotik-1")</p>
                  </div>
                  <div>
                    <strong>RADIUS Secret:</strong>
                    <p className="text-muted-foreground">Same secret you configured in Step 3</p>
                  </div>
                  <div>
                    <strong>Location:</strong>
                    <p className="text-muted-foreground">Physical location (e.g., "Main Office, Building A")</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-yellow-600" />
                Troubleshooting
              </h3>
              <div className="bg-white dark:bg-gray-900 p-4 rounded-lg space-y-2 text-sm">
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>Cannot connect to API:</strong> Check firewall rules, ensure API service is enabled and port 8728 is accessible</li>
                  <li><strong>Authentication failed:</strong> Verify username and password are correct, ensure user has proper permissions</li>
                  <li><strong>RADIUS not working:</strong> Confirm RADIUS secret matches on both sides, check network connectivity on ports 1812/1813</li>
                  <li><strong>Router shows offline:</strong> Verify network connection, check if router IP has changed</li>
                </ul>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-green-800 dark:text-green-200">Quick Tips</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300 ml-4">
                <li>Test the connection after adding a router - check if it appears online</li>
                <li>Use descriptive names for routers to easily identify them</li>
                <li>Keep RADIUS secrets secure and use strong passwords</li>
                <li>Enable the router before activating customer services</li>
                <li>Monitor the "Last Seen" timestamp to track router connectivity</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingRouter ? 'Edit Router' : 'Add New Router'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Router Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main Office Router"
                  required
                />
              </div>

              <div>
                <Label htmlFor="host">IP Address/Host *</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="192.168.88.1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="api_port">API Port</Label>
                <Input
                  id="api_port"
                  type="number"
                  value={formData.api_port}
                  onChange={(e) => setFormData({ ...formData, api_port: e.target.value })}
                  placeholder="8728"
                />
              </div>

              <div>
                <Label htmlFor="api_username">API Username *</Label>
                <Input
                  id="api_username"
                  value={formData.api_username}
                  onChange={(e) => setFormData({ ...formData, api_username: e.target.value })}
                  placeholder="admin"
                  required
                />
              </div>

              <div>
                <Label htmlFor="api_password">
                  API Password {editingRouter && '(leave empty to keep current)'}
                </Label>
                <Input
                  id="api_password"
                  type="password"
                  value={formData.api_password}
                  onChange={(e) => setFormData({ ...formData, api_password: e.target.value })}
                  placeholder={editingRouter ? '••••••••' : 'password'}
                  required={!editingRouter}
                />
              </div>

              <div>
                <Label htmlFor="nas_identifier">NAS Identifier</Label>
                <Input
                  id="nas_identifier"
                  value={formData.nas_identifier}
                  onChange={(e) => setFormData({ ...formData, nas_identifier: e.target.value })}
                  placeholder="mikrotik-1"
                />
              </div>

              <div>
                <Label htmlFor="radius_secret">
                  RADIUS Secret {editingRouter && '(leave empty to keep current)'}
                </Label>
                <Input
                  id="radius_secret"
                  type="password"
                  value={formData.radius_secret}
                  onChange={(e) => setFormData({ ...formData, radius_secret: e.target.value })}
                  placeholder={editingRouter ? '••••••••' : 'testing123'}
                  required={!editingRouter}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Main Office, Building A"
                />
              </div>

              <div>
                <Label htmlFor="role">Router Role *</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  <option value="hotspot">Hotspot (WiFi/Captive Portal)</option>
                  <option value="pppoe">PPPoE (Fiber/DSL)</option>
                  <option value="edge">Edge (Both Hotspot + PPPoE)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Determines which profile types will be synced to this router
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {editingRouter ? 'Update Router' : 'Add Router'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && routers.length === 0 ? (
        <div className="text-center py-8">Loading routers...</div>
      ) : (
        <div className="grid gap-4">
          {routers.map((router) => (
            <Card key={router.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Router className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">{router.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${router.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {router.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Host</div>
                      <div className="font-medium">{router.host}:{router.api_port}</div>
                    </div>

                    <div>
                      <div className="text-muted-foreground">Status</div>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded ${router.status === 'online' ? 'bg-green-100 text-green-800' :
                        router.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {router.status || 'offline'}
                      </span>
                    </div>

                    <div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Cpu className="w-3 h-3" /> CPU
                      </div>
                      <div className={`font-medium ${router.cpu_usage > 80 ? 'text-red-500' : ''}`}>
                        {router.cpu_usage ?? '-'}%
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <HardDrive className="w-3 h-3" /> Memory
                      </div>
                      <div className={`font-medium ${router.memory_usage > 80 ? 'text-red-500' : ''}`}>
                        {router.memory_usage ?? '-'}%
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Uptime
                      </div>
                      <div className="font-medium text-xs">{router.uptime || '-'}</div>
                    </div>

                    <div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> Role
                      </div>
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 capitalize">
                        {router.role || 'hotspot'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshRouterStatus(router.id)}
                    title="Check Status"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => diagnoseRouter(router.id)}
                    title="Diagnose Connection"
                    disabled={diagnosing === router.id}
                  >
                    <Stethoscope className={`w-4 h-4 ${diagnosing === router.id ? 'animate-pulse' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSetupScripts(router.id)}
                    title="Setup Scripts - Get MikroTik configuration scripts"
                  >
                    <BookOpen className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStatus(router.id, router.is_active)}
                  >
                    <Activity className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(router)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(router.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && routers.length === 0 && !showForm && (
        <Card className="p-12 text-center">
          <Router className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No routers found</h3>
          <p className="text-muted-foreground mb-4">
            Add your first MikroTik router to get started
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Router
          </Button>
        </Card>
      )}
    </div>
  );
}
