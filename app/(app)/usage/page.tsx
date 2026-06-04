"use client"

import * as React from "react"
import { AppHeader } from "@/components/layout/app-header"
import { DailyUsageChart } from "@/components/charts/daily-usage-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RangeDropdown } from "@/components/ui/range-dropdown"
import { useSelectedApiKey } from "@/hooks/use-api-keys"
import { useDailyUsage } from "@/hooks/use-usage"
import {
    formatCompactNumber,
    formatCurrency,
    formatTokens,
} from "@/lib/format"

const rangeOptions = [
    { value: "1", label: "Today" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
] as const

const metricOptions = [
    { value: "cost", label: "Cost" },
    { value: "tokens", label: "Tokens" },
    { value: "requests", label: "Requests" },
] as const

type Range = (typeof rangeOptions)[number]["value"]
type Metric = (typeof metricOptions)[number]["value"]

export default function UsagePage() {
    const [range, setRange] = React.useState<Range>("7")
    const [metric, setMetric] = React.useState<Metric>("cost")
    const selected = useSelectedApiKey()
    const { data, isLoading } = useDailyUsage(selected?.id, Number(range))

    const totals = React.useMemo(() => {
        if (!data) return null
        return data.reduce(
            (acc, d) => ({
                cost: acc.cost + d.costCents,
                tokens: acc.tokens + d.tokens,
                requests: acc.requests + d.requests,
            }),
            { cost: 0, tokens: 0, requests: 0 }
        )
    }, [data])

    const rangeLabel =
        rangeOptions.find((r) => r.value === range)?.label ?? ""

    return (
        <>
            <AppHeader title="Usage" subtitle={selected?.name} />

            <div className="space-y-4 px-4 pt-3">
                {isLoading || !data || !totals ? (
                    <>
                        <Skeleton className="h-56 w-full rounded-xl" />
                        <Skeleton className="h-72 w-full rounded-xl" />
                    </>
                ) : (
                    <>
                        <Card className="shadow-none py-0">
                            <CardContent className="space-y-5 px-5 py-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-semibold">
                                        Total spend
                                    </h2>
                                    <RangeDropdown
                                        value={range}
                                        options={rangeOptions}
                                        onChange={setRange}
                                    />
                                </div>
                                <div className="space-y-1 text-center">
                                    <div className="text-4xl font-bold tracking-tight tabular-nums">
                                        {formatCurrency(totals.cost)}
                                    </div>
                                    <div className="text-muted-foreground text-sm">
                                        {rangeLabel}
                                    </div>
                                </div>
                                <div className="bg-muted/40 grid grid-cols-2 divide-x rounded-xl">
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-muted-foreground text-xs">
                                            Tokens
                                        </div>
                                        <div className="mt-0.5 font-semibold tabular-nums">
                                            {formatTokens(totals.tokens)}
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-muted-foreground text-xs">
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

                        <Card className="shadow-none py-0">
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
                                <DailyUsageChart data={data} metric={metric} />
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    )
}
