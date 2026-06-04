"use client"

import * as React from "react"
import { AppHeader } from "@/components/layout/app-header"
import { DailyUsageChart } from "@/components/charts/daily-usage-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RangeDropdown } from "@/components/ui/range-dropdown"
import { useSelectedApiKey } from "@/hooks/use-api-keys"
import { useKeyModelUsage } from "@/hooks/use-key-quota"
import { formatCompactNumber } from "@/lib/format"
import type { DailyUsagePoint } from "@/lib/types"

const rangeOptions = [
    { value: "1", label: "Today" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
] as const

const metricOptions = [
    { value: "tokens", label: "Tokens" },
    { value: "requests", label: "Requests" },
] as const

type Range = (typeof rangeOptions)[number]["value"]
type Metric = (typeof metricOptions)[number]["value"]

export default function UsagePage() {
    const [range, setRange] = React.useState<Range>("7")
    const [metric, setMetric] = React.useState<Metric>("tokens")
    const selected = useSelectedApiKey()
    const { data, isLoading, error } = useKeyModelUsage(selected, Number(range))

    const series: DailyUsagePoint[] = React.useMemo(() => {
        if (!data) return []
        return data.x_time.map((date, i) => ({
            date,
            tokens: data.tokensUsage[i] ?? 0,
            requests: data.modelCallCount[i] ?? 0,
            costCents: 0,
        }))
    }, [data])

    const totals = React.useMemo(() => {
        if (!data) return null
        return {
            tokens: data.totalUsage.totalTokensUsage,
            requests: data.totalUsage.totalModelCallCount,
        }
    }, [data])

    const rangeLabel = rangeOptions.find((r) => r.value === range)?.label ?? ""
    const metricLabel = metric === "tokens" ? "Tokens" : "Requests"

    return (
        <>
            <AppHeader title="Usage" subtitle={selected?.name} />

            <div className="space-y-4 px-4 pt-3">
                {isLoading ? (
                    <>
                        <Skeleton className="h-56 w-full rounded-xl" />
                        <Skeleton className="h-72 w-full rounded-xl" />
                    </>
                ) : error || !data || !totals ? (
                    <Card className="py-0 shadow-none">
                        <CardContent className="px-5 py-6 text-center text-sm text-muted-foreground">
                            Couldn’t load usage. The selected key may not be on
                            a Coding Plan.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="py-0 shadow-none">
                            <CardContent className="space-y-5 px-5 py-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-semibold">
                                        Total {metricLabel.toLowerCase()}
                                    </h2>
                                    <RangeDropdown
                                        value={range}
                                        options={rangeOptions}
                                        onChange={setRange}
                                    />
                                </div>
                                <div className="space-y-1 text-center">
                                    <div className="text-4xl font-bold tracking-tight tabular-nums">
                                        {formatCompactNumber(
                                            metric === "tokens"
                                                ? totals.tokens
                                                : totals.requests
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {rangeLabel}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 divide-x rounded-xl bg-muted/40">
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-xs text-muted-foreground">
                                            Tokens
                                        </div>
                                        <div className="mt-0.5 font-semibold tabular-nums">
                                            {formatCompactNumber(totals.tokens)}
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-xs text-muted-foreground">
                                            Requests
                                        </div>
                                        <div className="mt-0.5 font-semibold tabular-nums">
                                            {formatCompactNumber(
                                                totals.requests
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="py-0 shadow-none">
                            <CardContent className="px-5 py-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-base font-semibold">
                                        Daily breakdown
                                    </h2>
                                    <RangeDropdown
                                        value={metric}
                                        options={metricOptions}
                                        onChange={setMetric}
                                    />
                                </div>
                                <DailyUsageChart
                                    data={series}
                                    metric={metric}
                                />
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    )
}
