"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: LucideIcon;
  description?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description,
  loading = false,
  className,
  onClick
}: KPICardProps) {
  if (loading) {
    return (
      <Card className={cn("transition-colors", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  const changeVariant =
    changeType === 'positive' ? 'success' :
    changeType === 'negative' ? 'destructive' :
    'secondary';

  return (
    <Card
      className={cn(
        "transition-colors hover:bg-muted/50",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {change && (
            <Badge variant={changeVariant} className="text-xs">
              {change}
            </Badge>
          )}
          {description && <span>{description}</span>}
        </div>
      </CardContent>
    </Card>
  );
}