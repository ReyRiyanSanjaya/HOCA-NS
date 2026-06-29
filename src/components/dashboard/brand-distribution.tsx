"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BrandCount } from "@/types";
import { getBrandColor, formatNumber } from "@/lib/utils";

interface BrandDistributionProps {
  data?: BrandCount[];
  loading: boolean;
}

export function BrandDistribution({ data, loading }: BrandDistributionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const total = data?.reduce((sum, d) => sum + d.count, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Brand Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="brand"
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.brand}
                      fill={getBrandColor(entry.brand)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const v = Number(value);
                    return [`${formatNumber(v)} (${((v / total) * 100).toFixed(1)}%)`, "Count"];
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Brand List */}
            <div className="mt-2 space-y-1.5">
              {data.map((d) => (
                <div key={d.brand} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getBrandColor(d.brand) }}
                    />
                    <span className="font-medium">{d.brand}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {((d.count / total) * 100).toFixed(1)}%
                    </span>
                    <span className="font-semibold">{formatNumber(d.count)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
