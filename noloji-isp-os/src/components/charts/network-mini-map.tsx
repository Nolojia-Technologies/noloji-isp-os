"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface NetworkNodeProps {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning';
  x: number;
  y: number;
  type: 'router' | 'switch' | 'olt' | 'customer';
}

interface NetworkMiniMapProps {
  nodes?: NetworkNodeProps[];
  loading?: boolean;
  className?: string;
}

// Mock network topology data
const mockNetworkNodes: NetworkNodeProps[] = [
  { id: '1', name: 'Core Router', status: 'online', x: 50, y: 20, type: 'router' },
  { id: '2', name: 'Westlands OLT', status: 'online', x: 20, y: 50, type: 'olt' },
  { id: '3', name: 'Karen OLT', status: 'warning', x: 80, y: 50, type: 'olt' },
  { id: '4', name: 'Kilimani Switch', status: 'online', x: 50, y: 80, type: 'switch' },
  { id: '5', name: 'Industrial OLT', status: 'offline', x: 35, y: 65, type: 'olt' },
];

const connections = [
  { from: '1', to: '2' },
  { from: '1', to: '3' },
  { from: '1', to: '4' },
  { from: '2', to: '5' },
];

export function NetworkMiniMap({ nodes = mockNetworkNodes, loading = false, className }: NetworkMiniMapProps) {
  const getNodeColor = (status: NetworkNodeProps['status']) => {
    switch (status) {
      case 'online':
        return 'fill-success stroke-success';
      case 'warning':
        return 'fill-warning stroke-warning';
      case 'offline':
        return 'fill-danger stroke-danger';
      default:
        return 'fill-muted stroke-muted';
    }
  };

  const getNodeIcon = (type: NetworkNodeProps['type']) => {
    switch (type) {
      case 'router':
        return '⚡';
      case 'olt':
        return '📡';
      case 'switch':
        return '🔗';
      case 'customer':
        return '🏠';
      default:
        return '●';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const statusCounts = nodes.reduce((acc, node) => {
    acc[node.status] = (acc[node.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Network Topology</CardTitle>
          <div className="flex space-x-2">
            {statusCounts.online && (
              <Badge variant="success" className="text-xs">
                {statusCounts.online} Online
              </Badge>
            )}
            {statusCounts.warning && (
              <Badge variant="warning" className="text-xs">
                {statusCounts.warning} Warning
              </Badge>
            )}
            {statusCounts.offline && (
              <Badge variant="destructive" className="text-xs">
                {statusCounts.offline} Offline
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-48 bg-muted/20 rounded-lg overflow-hidden">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Render connections */}
            {connections.map((conn, index) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);

              if (!fromNode || !toNode) return null;

              return (
                <line
                  key={index}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="0.5"
                  strokeDasharray="1,1"
                />
              );
            })}

            {/* Render nodes */}
            {nodes.map((node) => (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="3"
                  className={cn("stroke-2", getNodeColor(node.status))}
                />

                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y - 5}
                  textAnchor="middle"
                  className="fill-foreground text-xs font-medium"
                  fontSize="3"
                >
                  {getNodeIcon(node.type)}
                </text>

                {/* Node name tooltip area */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="6"
                  fill="transparent"
                  className="cursor-pointer"
                >
                  <title>{node.name} - {node.status}</title>
                </circle>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-2 left-2 text-xs space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-muted-foreground">Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-warning"></div>
              <span className="text-muted-foreground">Warning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-danger"></div>
              <span className="text-muted-foreground">Offline</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}