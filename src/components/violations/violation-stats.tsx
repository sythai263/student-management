"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import { Skeleton } from "../ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { useViolationStats } from "@hooks";

const TOP_N = 8;
const MAX_NAME_LEN = 20;

const chartConfig = {
  count: {
    label: "Lần vi phạm",
    color: "var(--destructive)",
  },
} satisfies ChartConfig;

interface ViolationStatsProps {
  classId: string;
}

/** Top students by violation count — horizontal bars fit long names. */
export function ViolationStats({ classId }: ViolationStatsProps) {
  const { data: stats, isLoading } = useViolationStats(classId, TOP_N);
  const data = (stats ?? []).map((s) => ({
    name: s.studentName,
    count: s.violationCount,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vi phạm nhiều nhất</CardTitle>
        <CardDescription>
          Top {TOP_N} học sinh có nhiều lần vi phạm nhất trong lớp
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 />
              </EmptyMedia>
              <EmptyTitle>Chưa có dữ liệu vi phạm.</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: Math.max(160, data.length * 44) }}
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 36, top: 4, bottom: 4 }}
              barCategoryGap="30%"
            >
              <XAxis
                type="number"
                domain={[0, (max: number) => max * 1.05]}
                allowDecimals={false}
                hide
              />
              <YAxis
                type="category"
                dataKey="name"
                width={190}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                interval={0}
                tickFormatter={(v: string) =>
                  v.length > MAX_NAME_LEN
                    ? `${v.slice(0, MAX_NAME_LEN - 1)}…`
                    : v
                }
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                fillOpacity={0.85}
                radius={[0, 6, 6, 0]}
                barSize={22}
                background={{
                  fill: "var(--muted)",
                  opacity: 0.4,
                  radius: 6,
                }}
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  className="fill-muted-foreground text-xs font-medium"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
