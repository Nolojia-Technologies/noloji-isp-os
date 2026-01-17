'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { nolojiApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { MessageSquare, DollarSign, Send, History, FileText, Plus } from 'lucide-react';

export default function SMSPage() {
  const [balance, setBalance] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [sendForm, setSendForm] = useState({
    recipient: '',
    message: '',
    sender_id: 'NOLOJI'
  });

  const [creditsForm, setCreditsForm] = useState({
    amount: '',
    cost_per_sms: '0.50'
  });

  useEffect(() => {
    loadBalance();
    loadStats();
    loadLogs();
    loadTemplates();
  }, []);

  const loadBalance = async () => {
    try {
      const data = await nolojiApi.sms.getBalance();
      setBalance(data);
    } catch (error: any) {
      console.error('Failed to load balance:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await nolojiApi.sms.getStats();
      setStats(data);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await nolojiApi.sms.getLogs(undefined, undefined, 50);
      setLogs(data.data || []);
    } catch (error: any) {
      console.error('Failed to load logs:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await nolojiApi.sms.getTemplates();
      setTemplates(data);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await nolojiApi.sms.sendSMS(
        sendForm.recipient,
        sendForm.message,
        undefined,
        sendForm.sender_id
      );

      toast({
        title: 'Success',
        description: 'SMS sent successfully'
      });

      setSendForm({ recipient: '', message: '', sender_id: 'NOLOJI' });
      loadBalance();
      loadStats();
      loadLogs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to send SMS',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      await nolojiApi.sms.addCredits(
        parseInt(creditsForm.amount),
        parseFloat(creditsForm.cost_per_sms)
      );

      toast({
        title: 'Success',
        description: `Added ${creditsForm.amount} SMS credits`
      });

      setCreditsForm({ amount: '', cost_per_sms: '0.50' });
      loadBalance();
      loadStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to add credits',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = (template: any) => {
    setSendForm({ ...sendForm, message: template.template });
  };

  const charCount = sendForm.message.length;
  const creditsNeeded = Math.ceil(charCount / 160) || 1;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">SMS Management</h1>
        <p className="text-muted-foreground">Manage SMS credits and send messages to customers</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Available</span>
          </div>
          <div className="text-2xl font-bold">{balance?.balance?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground">SMS Credits</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Sent</span>
          </div>
          <div className="text-2xl font-bold">{stats?.successful || 0}</div>
          <p className="text-xs text-muted-foreground">Total SMS</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Cost</span>
          </div>
          <div className="text-2xl font-bold">
            {balance?.currency} {balance?.cost_per_sms ? parseFloat(balance.cost_per_sms).toFixed(2) : '0.00'}
          </div>
          <p className="text-xs text-muted-foreground">Per SMS</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Used</span>
          </div>
          <div className="text-2xl font-bold">{stats?.total_credits_used || 0}</div>
          <p className="text-xs text-muted-foreground">SMS Credits</p>
        </Card>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Send SMS</TabsTrigger>
          <TabsTrigger value="credits">Manage Credits</TabsTrigger>
          <TabsTrigger value="logs">SMS Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Send SMS</h3>
              <form onSubmit={handleSendSMS} className="space-y-4">
                <div>
                  <Label htmlFor="recipient">Recipient Phone Number *</Label>
                  <Input
                    id="recipient"
                    value={sendForm.recipient}
                    onChange={(e) => setSendForm({ ...sendForm, recipient: e.target.value })}
                    placeholder="+254712345678"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sender_id">Sender ID</Label>
                  <Input
                    id="sender_id"
                    value={sendForm.sender_id}
                    onChange={(e) => setSendForm({ ...sendForm, sender_id: e.target.value })}
                    placeholder="NOLOJI"
                    maxLength={11}
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <textarea
                    id="message"
                    className="w-full min-h-[120px] p-2 border rounded-md"
                    value={sendForm.message}
                    onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                    placeholder="Type your message here..."
                    required
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{charCount} characters</span>
                    <span>{creditsNeeded} credit{creditsNeeded > 1 ? 's' : ''} needed</span>
                  </div>
                </div>

                <Button type="submit" disabled={loading || !balance || balance.balance < creditsNeeded}>
                  <Send className="w-4 h-4 mr-2" />
                  Send SMS
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Templates</h3>
              <div className="space-y-2">
                {templates.slice(0, 5).map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => useTemplate(template)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    <div className="truncate">
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {template.template.substring(0, 50)}...
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="credits">
          <Card className="p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add SMS Credits</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Purchase SMS credits in bulk from your provider and add them here
            </p>

            <form onSubmit={handleAddCredits} className="space-y-4">
              <div>
                <Label htmlFor="amount">Number of Credits *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={creditsForm.amount}
                  onChange={(e) => setCreditsForm({ ...creditsForm, amount: e.target.value })}
                  placeholder="1000"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cost_per_sms">Cost per SMS (KES)</Label>
                <Input
                  id="cost_per_sms"
                  type="number"
                  step="0.01"
                  value={creditsForm.cost_per_sms}
                  onChange={(e) => setCreditsForm({ ...creditsForm, cost_per_sms: e.target.value })}
                  placeholder="0.50"
                />
              </div>

              <Button type="submit" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Credits
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">SMS Logs</h3>
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No SMS logs found</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border-b pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{log.recipient}</div>
                        <div className="text-sm text-muted-foreground">{log.message}</div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            log.status === 'SENT'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {log.status}
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(log.sent_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">SMS Templates</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{template.name}</h4>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                  <div className="text-sm bg-gray-50 p-2 rounded">{template.template}</div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
