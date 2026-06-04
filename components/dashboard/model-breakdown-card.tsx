"use client"

import * as React from "react"
import Link from "next/link"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    ArrowRight01Icon,
    CheckmarkCircle01Icon,
    ChevronDownIcon,
} from "@hugeicons/core-free-icons"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactNumber } from "@/lib/format"
import { useKeyModelUsage } from "@/hooks/use-key-quota"
import type { ApiKey } from "@/lib/types"

const ranges = [
    { value: 1, label: "Today" },
    { value: 7, label: "Last 7 days" },
    { value: 30, label: "Last 30 days" },
] as const

const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
]

export function ModelBreakdownCard({ apiKey }: { apiKey: ApiKey }) {
    const [range, setRange] = React.useState<number>(7)
    const { data, isLoading } = useKeyModelUsage(apiKey, range)

    if (isLoading || !data) {
        return <Skeleton className="h-72 w-full rounded-xl" />
    }

    const models = data.modelSummaryList
        .slice()
        .sort((a, b) => b.totalTokens - a.totalTokens)
    const total = data.totalUsage.totalTokensUsage

    if (models.length === 0 || total === 0) {
        return (
            <Card className="py-0 shadow-none">
                <CardContent className="px-5 py-6 text-center text-sm text-muted-foreground">
                    No model usage recorded{" "}
                    {range === 1 ? "today" : `in the last ${range} days`}.
                </CardContent>
            </Card>
        )
    }

    const chartData = models.map((m, i) => ({
        name: m.modelName,
        value: m.totalTokens,
        fill: palette[i % palette.length],
    }))

    return (
        <Card className="py-0 shadow-none">
            <CardContent className="px-5 py-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Tokens by model</h2>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="gap-1 rounded-full"
                            >
                                {ranges.find((r) => r.value === range)?.label}
                                <HugeiconsIcon
                                    icon={ChevronDownIcon}
                                    size={14}
                                />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {ranges.map((r) => (
                                <DropdownMenuItem
                                    key={r.value}
                                    onClick={() => setRange(r.value)}
                                >
                                    {r.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="relative mx-auto mt-4 h-52 w-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius="72%"
                                outerRadius="100%"
                                paddingAngle={2}
                                stroke="none"
                                startAngle={90}
                                endAngle={-270}
                            >
                                {chartData.map((d) => (
                                    <Cell key={d.name} fill={d.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-xs text-muted-foreground">
                            Total tokens
                        </div>
                        <div className="text-xl font-bold tabular-nums">
                            {formatCompactNumber(total)}
                        </div>
                    </div>
                </div>

                <div className="mt-2 divide-y">
                    {models.slice(0, 5).map((m, i) => {
                        const share = Math.round((m.totalTokens / total) * 100)
                        return (
                            <Link
                                key={m.modelName}
                                href="/usage"
                                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/40"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span
                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                                        style={{
                                            color: palette[i % palette.length],
                                        }}
                                    >
                                        <HugeiconsIcon
                                            icon={CheckmarkCircle01Icon}
                                            size={20}
                                        />
                                    </span>
                                    <span className="truncate text-sm font-medium">
                                        {m.modelName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <div className="text-sm font-semibold tabular-nums">
                                            {formatCompactNumber(m.totalTokens)}
                                        </div>
                                        <div className="text-xs text-muted-foreground tabular-nums">
                                            {share}%
                                        </div>
                                    </div>
                                    <HugeiconsIcon
                                        icon={ArrowRight01Icon}
                                        size={16}
                                        className="text-muted-foreground"
                                    />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
