"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { AppHeader } from "@/components/layout/app-header"
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
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
    { value: "365", label: "Last year" },
] as const

type Range = (typeof rangeOptions)[number]["value"]

export default function HistoryPage() {
    const [range, setRange] = React.useState<Range>("30")
    const selected = useSelectedApiKey()
    const { data, isLoading } = useDailyUsage(selected?.id, Number(range))

    const total = React.useMemo(() => {
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
            <AppHeader title="History" subtitle={selected?.name} />

            <div className="space-y-4 px-4 pt-3">
                {isLoading || !data || !total ? (
                    <>
                        <Skeleton className="h-44 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </>
                ) : (
                    <>
                        <Card className="shadow-none py-0">
                            <CardContent className="space-y-5 px-5 py-5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-semibold">
                                        Range total
                                    </h2>
                                    <RangeDropdown
                                        value={range}
                                        options={rangeOptions}
                                        onChange={setRange}
                                    />
                                </div>
                                <div className="space-y-1 text-center">
                                    <div className="text-4xl font-bold tracking-tight tabular-nums">
                                        {formatCurrency(total.cost)}
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
                                            {formatTokens(total.tokens)}
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-muted-foreground text-xs">
                                            Requests
                                        </div>
                                        <div className="mt-0.5 font-semibold tabular-nums">
                                            {formatCompactNumber(
                                                total.requests
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-none py-0">
                            <CardContent className="divide-border/60 divide-y px-5 py-2">
                                {data
                                    .slice()
                                    .reverse()
                                    .map((d) => (
                                        <div
                                            key={d.date}
                                            className="flex items-center justify-between gap-3 py-3"
                                        >
                                            <div className="text-sm font-medium">
                                                {format(
                                                    parseISO(d.date),
                                                    "MMM d, yyyy"
                                                )}
                                            </div>
                                            <div className="flex items-baseline gap-3 text-xs tabular-nums">
                                                <span className="text-muted-foreground">
                                                    {formatCompactNumber(
                                                        d.requests
                                                    )}{" "}
                                                    req
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {formatTokens(d.tokens)}
                                                </span>
                                                <span className="text-sm font-semibold">
                                                    {formatCurrency(d.costCents)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    )
}
