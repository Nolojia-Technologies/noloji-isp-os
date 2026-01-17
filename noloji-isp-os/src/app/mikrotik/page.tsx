'use client';

import { useState, useEffect } from 'react';
import { nolojiApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Router,
  Wifi,
  Users,
  Activity,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCcw,
  UserX,
  Gauge
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function MikroTikPage() {
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [systemResources, setSystemResources] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [radiusConfig, setRadiusConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Test connection
  const testConnection = async () => {
    setLoading(true);
    try {
      const result = await nolojiApi.mikrotik.testConnection();
      setConnectionStatus(result);

      if (result.success && result.connected) {
        toast({
          title: 'Connected!',
          description: `Connected to ${result.identity}`,
        });
        // Load all data if connected
        loadAllData();
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error || 'Could not connect to MikroTik router',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load all data
  const loadAllData = async () => {
    try {
      const [resources, users, queuesData, radius] = await Promise.all([
        nolojiApi.mikrotik.getSystemResources().catch(() => null),
        nolojiApi.mikrotik.getActiveHotspotUsers().catch(() => []),
        nolojiApi.mikrotik.getQueues().catch(() => []),
        nolojiApi.mikrotik.checkRadiusConfig().catch(() => []),
      ]);

      setSystemResources(resources);
      setActiveUsers(users);
      setQueues(queuesData);
      setRadiusConfig(radius);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Disconnect user
  const disconnectUser = async (username: string) => {
    setDisconnecting(username);
    try {
      await nolojiApi.mikrotik.disconnectUser(username);
      toast({
        title: 'User Disconnected',
        description: `${username} has been disconnected`,
      });
      // Reload active users
      const users = await nolojiApi.mikrotik.getActiveHotspotUsers();
      setActiveUsers(users);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(null);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format percentage
  const formatPercentage = (used: number, total: number) => {
    return ((used / total) * 100).toFixed(1) + '%';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MikroTik Management</h1>
          <p className="text-muted-foreground">Configure and monitor your MikroTik router</p>
        </div>
        <Button onClick={testConnection} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Test Connection
        </Button>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Router className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectionStatus ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {connectionStatus.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {connectionStatus.connected && (
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Router Identity</p>
                    <p className="font-medium">{connectionStatus.identity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="font-medium">{connectionStatus.version}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                    <p className="font-medium">{connectionStatus.uptime}</p>
                  </div>
                </div>
              )}
              {!connectionStatus.connected && connectionStatus.error && (
                <p className="text-sm text-red-500">{connectionStatus.error}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>Click "Test Connection" to check MikroTik router status</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content - Only show if connected */}
      {connectionStatus?.connected && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Active Users</TabsTrigger>
            <TabsTrigger value="queues">Bandwidth Queues</TabsTrigger>
            <TabsTrigger value="radius">RADIUS Config</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* System Resources */}
            {systemResources && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">CPU Load</p>
                      </div>
                      <p className="text-2xl font-bold">{systemResources.cpuLoad}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Memory</p>
                      <p className="text-2xl font-bold">
                        {formatPercentage(
                          systemResources.totalMemory - systemResources.freeMemory,
                          systemResources.totalMemory
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(systemResources.totalMemory - systemResources.freeMemory)} / {formatBytes(systemResources.totalMemory)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Board</p>
                      <p className="text-sm font-medium">{systemResources.boardName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Version</p>
                      <p className="text-sm font-medium">{systemResources.version}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeUsers.length}</div>
                  <p className="text-xs text-muted-foreground">Online hotspot users</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Bandwidth Queues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queues.length}</div>
                  <p className="text-xs text-muted-foreground">Active traffic queues</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">RADIUS Servers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{radiusConfig.length}</div>
                  <p className="text-xs text-muted-foreground">Configured servers</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Active Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Active Hotspot Users ({activeUsers.length})
                </CardTitle>
                <CardDescription>Currently connected users on the hotspot</CardDescription>
              </CardHeader>
              <CardContent>
                {activeUsers.length > 0 ? (
                  <div className="space-y-2">
                    {activeUsers.map((user: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium">{user.user}</p>
                            <p className="text-xs text-muted-foreground">Username</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.address}</p>
                            <p className="text-xs text-muted-foreground">IP Address</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.macAddress}</p>
                            <p className="text-xs text-muted-foreground">MAC Address</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.uptime}</p>
                            <p className="text-xs text-muted-foreground">Session Time</p>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => disconnectUser(user.user)}
                          disabled={disconnecting === user.user}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          {disconnecting === user.user ? 'Disconnecting...' : 'Disconnect'}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No active users connected
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bandwidth Queues Tab */}
          <TabsContent value="queues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Bandwidth Queues ({queues.length})
                </CardTitle>
                <CardDescription>Active bandwidth control rules</CardDescription>
              </CardHeader>
              <CardContent>
                {queues.length > 0 ? (
                  <div className="space-y-2">
                    {queues.map((queue: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium">{queue.name}</p>
                            <p className="text-xs text-muted-foreground">Name</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{queue.target}</p>
                            <p className="text-xs text-muted-foreground">Target</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{queue.maxLimit}</p>
                            <p className="text-xs text-muted-foreground">Max Limit</p>
                          </div>
                          <div>
                            <Badge variant="secondary">Active</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No bandwidth queues configured
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RADIUS Config Tab */}
          <TabsContent value="radius" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  RADIUS Configuration
                </CardTitle>
                <CardDescription>RADIUS servers configured on the router</CardDescription>
              </CardHeader>
              <CardContent>
                {radiusConfig.length > 0 ? (
                  <div className="space-y-2">
                    {radiusConfig.map((config: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm font-medium">{config.service}</p>
                            <p className="text-xs text-muted-foreground">Service</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{config.address}</p>
                            <p className="text-xs text-muted-foreground">Server Address</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{config.timeout}</p>
                            <p className="text-xs text-muted-foreground">Timeout</p>
                          </div>
                          <div>
                            <Badge variant={config.disabled ? 'destructive' : 'default'}>
                              {config.disabled ? 'Disabled' : 'Active'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">No RADIUS servers configured</p>
                    <p className="text-sm text-muted-foreground">
                      Configure RADIUS on your MikroTik router to enable authentication
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
