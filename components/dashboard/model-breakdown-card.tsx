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
import { PopNumber } from "@/components/ui/pop-number"
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
    const [range, setRange] = React.useState<number>(1)
    const results = useKeysModelUsage(keys, range)

    const isLoading = results.some((r) => r.isLoading)

    if (isLoading) {
        return (
            <Card className="py-0 shadow-none">
                <CardContent className="px-5 py-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold">
                            Token spend by key
                        </h2>
                        <RangePicker range={range} setRange={setRange} />
                    </div>

                    <div className="relative mx-auto mt-4 h-52 w-52">
                        <div className="absolute inset-0 rounded-full bg-muted/60" />
                        <div className="absolute inset-[14%] rounded-full bg-background" />
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <div className="text-xs text-muted-foreground">
                                Total tokens
                            </div>
                            <Skeleton className="h-5 w-16 rounded-md" />
                        </div>
                    </div>

                    <div className="mt-2 divide-y">
                        {keys.map((k, i) => (
                            <div
                                key={k.id}
                                className="flex flex-col gap-2 py-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor:
                                                    palette[i % palette.length],
                                            }}
                                        />
                                        <span className="truncate text-sm font-medium">
                                            {k.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-12 rounded-md" />
                                        <Skeleton className="h-3 w-8 rounded-md" />
                                    </div>
                                </div>
                                <Skeleton className="h-1 w-full rounded-full" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    const perKey = keys
        .map((k, i) => ({
            key: k,
            color: palette[i % palette.length],
            total: results[i].data?.totalUsage.totalTokensUsage ?? 0,
            errored: Boolean(results[i].error),
        }))
        .sort((a, b) => b.total - a.total)

    const total = perKey.reduce((sum, p) => sum + p.total, 0)

    if (total === 0) {
        return (
            <Card className="py-0 shadow-none">
                <CardContent className="space-y-5 px-5 py-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold">
                            Token spend by key
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
                    <h2 className="text-base font-semibold">
                        Token spend by key
                    </h2>
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
                        <PopNumber
                            value={formatCompactNumber(total)}
                            className="text-xl font-bold tabular-nums"
                        />
                    </div>
                </div>

                <div className="mt-2 divide-y">
                    {perKey.map((p) => {
                        const rawShare = total > 0 ? (p.total / total) * 100 : 0
                        const share = Math.round(rawShare)
                        const shareLabel =
                            p.total > 0 && rawShare < 1 ? "<1%" : `${share}%`
                        return (
                            <div
                                key={p.key.id}
                                className="flex flex-col gap-2 py-3"
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
                                    <div className="flex items-baseline gap-2">
                                        {p.errored ? (
                                            <span className="text-sm font-semibold tabular-nums">
                                                —
                                            </span>
                                        ) : (
                                            <PopNumber
                                                value={formatCompactNumber(
                                                    p.total
                                                )}
                                                className="text-sm font-semibold tabular-nums"
                                            />
                                        )}
                                        {p.errored ? (
                                            <span className="text-sm text-muted-foreground tabular-nums">
                                                n/a
                                            </span>
                                        ) : (
                                            <PopNumber
                                                value={shareLabel}
                                                className="text-sm text-muted-foreground tabular-nums"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
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
