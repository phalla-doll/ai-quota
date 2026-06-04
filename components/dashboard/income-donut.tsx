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
import { formatCurrency } from "@/lib/format"
import type { ModelUsage } from "@/lib/types"

const ranges = [
    { value: "all", label: "All time" },
    { value: "30", label: "Last 30 days" },
    { value: "7", label: "Last 7 days" },
] as const
type Range = (typeof ranges)[number]["value"]

const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
]

type IncomeDonutProps = {
    models: ModelUsage[]
}

export function IncomeDonut({ models }: IncomeDonutProps) {
    const [range, setRange] = React.useState<Range>("all")
    const selectedLabel =
        ranges.find((r) => r.value === range)?.label ?? "All time"

    const sorted = React.useMemo(
        () => models.slice().sort((a, b) => b.costCents - a.costCents),
        [models]
    )
    const total = sorted.reduce((s, m) => s + m.costCents, 0)
    const data = sorted.map((m, i) => ({
        name: m.model,
        value: m.costCents,
        fill: palette[i % palette.length],
    }))

    return (
        <Card className="shadow-none py-0">
            <CardContent className="px-5 py-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Spend by model</h2>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="gap-1 rounded-full"
                            >
                                {selectedLabel}
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
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius="72%"
                                outerRadius="100%"
                                paddingAngle={2}
                                stroke="none"
                                startAngle={90}
                                endAngle={-270}
                            >
                                {data.map((d) => (
                                    <Cell key={d.name} fill={d.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-muted-foreground text-xs">
                            Total spend
                        </div>
                        <div className="text-xl font-bold tabular-nums">
                            {formatCurrency(total)}
                        </div>
                    </div>
                </div>

                <div className="mt-2 divide-y">
                    {sorted.slice(0, 3).map((m, i) => (
                        <Link
                            key={m.model}
                            href="/models"
                            className="hover:bg-muted/40 -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors"
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
                                    {m.model}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold tabular-nums">
                                    {formatCurrency(m.costCents)}
                                </span>
                                <HugeiconsIcon
                                    icon={ArrowRight01Icon}
                                    size={16}
                                    className="text-muted-foreground"
                                />
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
