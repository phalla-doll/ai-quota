"use client"

import { format, parseISO } from "date-fns"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { formatCurrency, formatTokens } from "@/lib/format"
import type { DailyUsagePoint } from "@/lib/types"

type DailyUsageChartProps = {
    data: DailyUsagePoint[]
    metric: "cost" | "tokens" | "requests"
}

const metricConfig = {
    cost: {
        label: "Cost",
        accessor: (d: DailyUsagePoint) => d.costCents,
        format: (v: number) => formatCurrency(v),
    },
    tokens: {
        label: "Tokens",
        accessor: (d: DailyUsagePoint) => d.tokens,
        format: (v: number) => formatTokens(v),
    },
    requests: {
        label: "Requests",
        accessor: (d: DailyUsagePoint) => d.requests,
        format: (v: number) =>
            new Intl.NumberFormat("en-US").format(Math.round(v)),
    },
} as const

export function DailyUsageChart({ data, metric }: DailyUsageChartProps) {
    const cfg = metricConfig[metric]
    const series = data.map((d) => ({
        date: d.date,
        value: cfg.accessor(d),
    }))

    return (
        <div className="-mx-2">
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={series}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient
                                id="usage-grad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="var(--chart-2)"
                                    stopOpacity={0.5}
                                />
                                <stop
                                    offset="100%"
                                    stopColor="var(--chart-2)"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="var(--border)"
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(v: string) =>
                                format(parseISO(v), "MMM d")
                            }
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            minTickGap={20}
                            stroke="var(--muted-foreground)"
                        />
                        <YAxis
                            tickFormatter={(v: number) => cfg.format(v)}
                            tickLine={false}
                            axisLine={false}
                            width={56}
                            fontSize={11}
                            stroke="var(--muted-foreground)"
                        />
                        <Tooltip
                            contentStyle={{
                                background: "var(--popover)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-md)",
                                color: "var(--popover-foreground)",
                                fontSize: 12,
                            }}
                            labelFormatter={(label) =>
                                format(parseISO(label as string), "MMM d, yyyy")
                            }
                            formatter={(value) => [
                                cfg.format(Number(value)),
                                cfg.label,
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--chart-2)"
                            strokeWidth={2}
                            fill="url(#usage-grad)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
