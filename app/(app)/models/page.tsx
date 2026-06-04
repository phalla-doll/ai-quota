"use client"

import * as React from "react"
import { AppHeader } from "@/components/layout/app-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RangeDropdown } from "@/components/ui/range-dropdown"
import { useSelectedApiKey } from "@/hooks/use-api-keys"
import { useKeyModelUsage } from "@/hooks/use-key-quota"
import { formatCompactNumber } from "@/lib/format"

const ranges = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
] as const
type Range = (typeof ranges)[number]["value"]

const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
]

export default function ModelsPage() {
    const [range, setRange] = React.useState<Range>("7")
    const selected = useSelectedApiKey()
    const { data, isLoading, error } = useKeyModelUsage(selected, Number(range))

    return (
        <>
            <AppHeader title="Models" subtitle={selected?.name} />

            <div className="space-y-4 px-4 pt-3">
                {isLoading ? (
                    <>
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </>
                ) : error || !data ? (
                    <Card className="shadow-none py-0">
                        <CardContent className="text-muted-foreground px-5 py-6 text-center text-sm">
                            Couldn’t load model usage. The selected key may
                            not be on a Coding Plan.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="shadow-none py-0">
                            <CardContent className="space-y-5 px-5 py-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-semibold">
                                        Total tokens
                                    </h2>
                                    <RangeDropdown
                                        value={range}
                                        options={ranges}
                                        onChange={setRange}
                                    />
                                </div>
                                <div className="space-y-1 text-center">
                                    <div className="text-4xl font-bold tracking-tight tabular-nums">
                                        {formatCompactNumber(
                                            data.totalUsage.totalTokensUsage
                                        )}
                                    </div>
                                    <div className="text-muted-foreground text-sm">
                                        {data.modelSummaryList.length} models
                                        active
                                    </div>
                                </div>
                                <div className="bg-muted/40 grid grid-cols-2 divide-x rounded-xl">
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-muted-foreground text-xs">
                                            Requests
                                        </div>
                                        <div className="mt-0.5 font-semibold tabular-nums">
                                            {formatCompactNumber(
                                                data.totalUsage
                                                    .totalModelCallCount
                                            )}
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-muted-foreground text-xs">
                                            Models
                                        </div>
                                        <div className="mt-0.5 font-semibold tabular-nums">
                                            {data.modelSummaryList.length}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-none py-0">
                            <CardContent className="divide-border/60 divide-y px-5 py-2">
                                {data.modelSummaryList
                                    .slice()
                                    .sort(
                                        (a, b) =>
                                            b.totalTokens - a.totalTokens
                                    )
                                    .map((m, i) => {
                                        const total =
                                            data.totalUsage.totalTokensUsage
                                        const share =
                                            total > 0
                                                ? Math.round(
                                                      (m.totalTokens / total) *
                                                          100
                                                  )
                                                : 0
                                        return (
                                            <div
                                                key={m.modelName}
                                                className="flex items-center justify-between gap-3 py-3"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span
                                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                        style={{
                                                            background:
                                                                palette[
                                                                    i %
                                                                        palette.length
                                                                ],
                                                        }}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium">
                                                            {m.modelName}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold tabular-nums">
                                                        {formatCompactNumber(
                                                            m.totalTokens
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs tabular-nums">
                                                        {share}%
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    )
}
