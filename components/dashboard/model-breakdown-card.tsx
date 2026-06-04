"use client"

import * as React from "react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronDownIcon } from "@hugeicons/core-free-icons"
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
import { useKeysModelUsage } from "@/hooks/use-key-quota"
import { keyPalette } from "@/lib/key-palette"
import type { ApiKey } from "@/lib/types"

const ranges = [
    { value: 1, label: "Today" },
    { value: 7, label: "Last 7 days" },
    { value: 30, label: "Last 30 days" },
] as const

const palette = keyPalette

export function ModelBreakdownCard({ keys }: { keys: ApiKey[] }) {
    const [range, setRange] = React.useState<number>(7)
    const results = useKeysModelUsage(keys, range)

    const isLoading = results.some((r) => r.isLoading)

    if (isLoading) {
        return <Skeleton className="h-72 w-full rounded-xl" />
    }

    const perKey = keys.map((k, i) => ({
        key: k,
        color: palette[i % palette.length],
        total: results[i].data?.totalUsage.totalTokensUsage ?? 0,
        errored: Boolean(results[i].error),
    }))

    const total = perKey.reduce((sum, p) => sum + p.total, 0)

    if (total === 0) {
        return (
            <Card className="py-0 shadow-none">
                <CardContent className="space-y-5 px-5 py-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold">
                            Tokens by model
                        </h2>
                        <RangePicker range={range} setRange={setRange} />
                    </div>
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        No model usage recorded{" "}
                        {range === 1 ? "today" : `in the last ${range} days`}.
                    </div>
                </CardContent>
            </Card>
        )
    }

    const chartData = perKey
        .filter((p) => p.total > 0)
        .map((p) => ({
            name: p.key.name,
            value: p.total,
            fill: p.color,
        }))

    return (
        <Card className="py-0 shadow-none">
            <CardContent className="px-5 py-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Tokens by model</h2>
                    <RangePicker range={range} setRange={setRange} />
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
                    {perKey.map((p) => {
                        const share =
                            total > 0 ? Math.round((p.total / total) * 100) : 0
                        return (
                            <div
                                key={p.key.id}
                                className="-mx-2 flex flex-col gap-2 rounded-lg px-2 py-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{ backgroundColor: p.color }}
                                        />
                                        <span className="truncate text-sm font-medium">
                                            {p.key.name}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold tabular-nums">
                                            {p.errored
                                                ? "—"
                                                : formatCompactNumber(p.total)}
                                        </div>
                                        <div className="text-xs text-muted-foreground tabular-nums">
                                            {p.errored ? "n/a" : `${share}%`}
                                        </div>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${share}%`,
                                            backgroundColor: p.color,
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}

function RangePicker({
    range,
    setRange,
}: {
    range: number
    setRange: (n: number) => void
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 rounded-full"
                >
                    {ranges.find((r) => r.value === range)?.label}
                    <HugeiconsIcon icon={ChevronDownIcon} size={14} />
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
    )
}
