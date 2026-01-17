'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { mikrotikApi } from '@/lib/mikrotik-api';
import {
    Play,
    Pause,
    RefreshCw,
    Zap,
    Wifi,
    WifiOff,
    Loader2
} from 'lucide-react';

interface CustomerActionsProps {
    customerId: number;
    customerName: string;
    isActive: boolean;
    onStatusChange?: () => void;
}

/**
 * Customer action buttons for MikroTik operations
 */
export function CustomerActions({
    customerId,
    customerName,
    isActive,
    onStatusChange
}: CustomerActionsProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleAction = async (action: 'suspend' | 'activate' | 'provision') => {
        setLoading(action);

        try {
            let result;
            let successMessage = '';

            switch (action) {
                case 'suspend':
                    result = await mikrotikApi.suspendCustomer(customerId);
                    successMessage = `${customerName} has been suspended`;
                    break;
                case 'activate':
                    result = await mikrotikApi.activateCustomer(customerId);
                    successMessage = `${customerName} has been activated`;
                    break;
                case 'provision':
                    result = await mikrotikApi.provisionCustomer(customerId);
                    successMessage = `${customerName} has been provisioned on router`;
                    break;
            }

            if (result.success) {
                toast({
                    title: 'Success',
                    description: successMessage,
                });
                onStatusChange?.();
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Action failed',
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to connect to MikroTik service',
                variant: 'destructive',
            });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex gap-2">
            {isActive ? (
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction('suspend')}
                    disabled={loading !== null}
                >
                    {loading === 'suspend' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                        <WifiOff className="h-4 w-4 mr-1" />
                    )}
                    Suspend
                </Button>
            ) : (
                <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAction('activate')}
                    disabled={loading !== null}
                >
                    {loading === 'activate' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                        <Wifi className="h-4 w-4 mr-1" />
                    )}
                    Activate
                </Button>
            )}

            <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction('provision')}
                disabled={loading !== null}
            >
                {loading === 'provision' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                    <Zap className="h-4 w-4 mr-1" />
                )}
                Provision
            </Button>
        </div>
    );
}

interface RouterStatusProps {
    routerId: number;
    routerName: string;
}

/**
 * Router status display with health info
 */
export function RouterStatus({ routerId, routerName }: RouterStatusProps) {
    const [loading, setLoading] = useState(false);
    const [resources, setResources] = useState<{
        uptime: string;
        cpuLoad: number;
        freeMemory: number;
        totalMemory: number;
    } | null>(null);

    const refresh = async () => {
        setLoading(true);
        try {
            const data = await mikrotikApi.getRouterResources(routerId);
            if (data) {
                setResources(data);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch router status',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const memoryPercent = resources
        ? Math.round(((resources.totalMemory - resources.freeMemory) / resources.totalMemory) * 100)
        : 0;

    return (
        <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{routerName}</h3>
                <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {resources ? (
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Uptime:</span>
                        <span>{resources.uptime}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">CPU:</span>
                        <span className={resources.cpuLoad > 80 ? 'text-red-500' : ''}>
                            {resources.cpuLoad}%
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Memory:</span>
                        <span className={memoryPercent > 80 ? 'text-red-500' : ''}>
                            {memoryPercent}%
                        </span>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Click refresh to load status</p>
            )}
        </div>
    );
}

export default CustomerActions;
