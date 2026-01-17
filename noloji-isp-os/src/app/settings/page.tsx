"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  User,
  Shield,
  Bell,
  Globe,
  Database,
  Mail,
  Smartphone,
  Key,
  Monitor,
  Palette,
  Network,
  Clock,
  Save,
  RefreshCw
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              System configuration and preferences
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Reset</span>
            </Button>
            <Button className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Settings Navigation */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-primary/10 text-primary cursor-pointer">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">Account</span>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Security</span>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm">Notifications</span>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Network className="h-4 w-4" />
                  <span className="text-sm">Network</span>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Database className="h-4 w-4" />
                  <span className="text-sm">System</span>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                  <Palette className="h-4 w-4" />
                  <span className="text-sm">Appearance</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart Services
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Database className="h-4 w-4 mr-2" />
                  Backup Database
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Monitor className="h-4 w-4 mr-2" />
                  System Health
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Settings Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Account Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company Name</label>
                    <Input defaultValue="Noloji ISP Solutions" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Administrator Email</label>
                    <Input defaultValue="admin@noloji.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Support Phone</label>
                    <Input defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time Zone</label>
                    <Input defaultValue="UTC-5 (Eastern Time)" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security & Authentication</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-muted-foreground">Add extra security to your account</p>
                      </div>
                      <Badge variant="success">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Session Timeout</p>
                        <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
                      </div>
                      <Input className="w-20" defaultValue="30" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Password Policy</p>
                        <p className="text-xs text-muted-foreground">Minimum security requirements</p>
                      </div>
                      <Badge variant="outline">Strong</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">API Access</p>
                        <p className="text-xs text-muted-foreground">External system integration</p>
                      </div>
                      <Badge variant="warning">Limited</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Email Notifications</span>
                    </h4>
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">System Alerts</span>
                        <Badge variant="success">On</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Billing Reminders</span>
                        <Badge variant="success">On</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Weekly Reports</span>
                        <Badge variant="secondary">Off</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center space-x-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Push Notifications</span>
                    </h4>
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Critical Alerts</span>
                        <Badge variant="success">On</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Maintenance Windows</span>
                        <Badge variant="success">On</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Customer Messages</span>
                        <Badge variant="secondary">Off</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="h-5 w-5" />
                  <span>Network Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">DHCP Range Start</label>
                    <Input defaultValue="192.168.1.100" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">DHCP Range End</label>
                    <Input defaultValue="192.168.1.200" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">DNS Primary</label>
                    <Input defaultValue="8.8.8.8" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">DNS Secondary</label>
                    <Input defaultValue="8.8.4.4" />
                  </div>
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Bandwidth Monitoring</p>
                      <p className="text-xs text-muted-foreground">Track customer usage and quotas</p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="h-5 w-5" />
                  <span>System Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Version</span>
                      <span className="text-sm font-medium">v2.1.4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Database</span>
                      <span className="text-sm font-medium">PostgreSQL 14.2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Uptime</span>
                      <span className="text-sm font-medium">45 days, 12 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">License</span>
                      <Badge variant="success">Enterprise</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">CPU Usage</span>
                      <span className="text-sm font-medium">23%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <span className="text-sm font-medium">4.2 GB / 16 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Disk Space</span>
                      <span className="text-sm font-medium">127 GB / 500 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last Backup</span>
                      <span className="text-sm font-medium">2 hours ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}