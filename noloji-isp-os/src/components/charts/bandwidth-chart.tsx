"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/utils";

interface BandwidthChartProps {
  data?: Array<{
    timestamp: string;
    upload: number;
    download: number;
  }>;
  loading?: boolean;
  className?: string;
}

// Mock data for demonstration
const mockBandwidthData = [
  { timestamp: "00:00", upload: 45, download: 85 },
  { timestamp: "02:00", upload: 32, download: 68 },
  { timestamp: "04:00", upload: 28, download: 52 },
  { timestamp: "06:00", upload: 65, download: 92 },
  { timestamp: "08:00", upload: 88, download: 145 },
  { timestamp: "10:00", upload: 92, download: 156 },
  { timestamp: "12:00", upload: 78, download: 134 },
  { timestamp: "14:00", upload: 85, download: 142 },
  { timestamp: "16:00", upload: 95, download: 165 },
  { timestamp: "18:00", upload: 102, download: 178 },
  { timestamp: "20:00", upload: 88, download: 152 },
  { timestamp: "22:00", upload: 62, download: 118 },
];

type TimeRange = '24h' | '7d' | '30d';

export function BandwidthChart({ data, loading = false, className }: BandwidthChartProps) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>('24h');
  const [chartData, setChartData] = React.useState(data || mockBandwidthData);

  React.useEffect(() => {
    if (data) {
      setChartData(data);
    } else {
      // Generate different mock data based on time range
      switch (timeRange) {
        case '24h':
          setChartData(mockBandwidthData);
          break;
        case '7d':
          setChartData(
            Array.from({ length: 7 }, (_, i) => ({
              timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en', { weekday: 'short' }),
              upload: 60 + Math.random() * 40,
              download: 100 + Math.random() * 80,
            }))
          );
          break;
        case '30d':
          setChartData(
            Array.from({ length: 30 }, (_, i) => ({
              timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).getDate().toString(),
              upload: 50 + Math.random() * 50,
              download: 90 + Math.random() * 100,
            }))
          );
          break;
      }
    }
  }, [timeRange, data]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="text-sm font-medium">{`Time: ${label}`}</p>
          <p className="text-sm text-blue-600">
            {`Upload: ${formatBytes(payload[0].value * 1024 * 1024)}/s`}
          </p>
          <p className="text-sm text-green-600">
            {`Download: ${formatBytes(payload[1].value * 1024 * 1024)}/s`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bandwidth Usage</CardTitle>
          <div className="flex space-x-2">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) => `${value} MB/s`}
              />
              <Tooltip content={customTooltip} />
              <Legend />
              <Line
                type="monotone"
                dataKey="upload"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                name="Upload"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="download"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                name="Download"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}