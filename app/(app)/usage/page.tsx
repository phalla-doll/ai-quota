"use client"

import * as React from "react"
import { AppHeader } from "@/components/layout/app-header"
import {
    DailyUsageMultiChart,
    type KeySeries,
} from "@/components/charts/daily-usage-multi-chart"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RangeDropdown } from "@/components/ui/range-dropdown"
import { useApiKeys } from "@/hooks/use-api-keys"
import { useKeysModelUsage } from "@/hooks/use-key-quota"
import { formatCompactNumber } from "@/lib/format"
import { keyColor } from "@/lib/key-palette"

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
    const [range, setRange] = React.useState<Range>("1")
    const [metric, setMetric] = React.useState<Metric>("tokens")
    const { data: keys } = useApiKeys()
    const keyList = React.useMemo(() => keys ?? [], [keys])
    const results = useKeysModelUsage(keyList, Number(range))

    const isLoading = results.some((r) => r.isLoading)
    const allErrored =
        keyList.length > 0 && results.every((r) => r.error || !r.data)

    const totals = React.useMemo(() => {
        let tokens = 0
        let requests = 0
        for (const r of results) {
            if (!r.data) continue
            tokens += r.data.totalUsage.totalTokensUsage
            requests += r.data.totalUsage.totalModelCallCount
        }
        return { tokens, requests }
    }, [results])

    const series: KeySeries[] = React.useMemo(() => {
        return keyList
            .map((k, i) => {
                const data = results[i]?.data
                if (!data) return null
                return {
                    keyId: k.id,
                    name: k.name,
                    dates: data.x_time,
                    values:
                        metric === "tokens"
                            ? data.tokensUsage
                            : data.modelCallCount,
                }
            })
            .filter((s): s is KeySeries => s !== null)
    }, [keyList, results, metric])

    const rangeLabel = rangeOptions.find((r) => r.value === range)?.label ?? ""
    const metricLabel = metric === "tokens" ? "Tokens" : "Requests"

    return (
        <>
            <AppHeader
                title="Usage"
                subtitle="Across all your API keys"
                rightAction="add"
            />

            <div className="space-y-4 px-4 pt-3">
                {keyList.length === 0 || (!isLoading && allErrored) ? (
                    <Card className="py-0 shadow-none">
                        <CardContent className="px-5 py-6 text-center text-sm text-muted-foreground">
                            {keyList.length === 0
                                ? "Add an API key to see usage."
                                : "Couldn’t load usage for your keys."}
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
                                    {isLoading ? (
                                        <div className="flex justify-center">
                                            <Skeleton className="h-10 w-28 rounded-md" />
                                        </div>
                                    ) : (
                                        <div className="text-4xl font-bold tracking-tight tabular-nums">
                                            {formatCompactNumber(
                                                metric === "tokens"
                                                    ? totals.tokens
                                                    : totals.requests
                                            )}
                                        </div>
                                    )}
                                    <div className="text-sm text-muted-foreground">
                                        {rangeLabel}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 divide-x rounded-xl bg-muted/40">
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-xs text-muted-foreground">
                                            Tokens
                                        </div>
                                        {isLoading ? (
                                            <div className="mt-1 flex justify-center">
                                                <Skeleton className="h-4 w-12 rounded-md" />
                                            </div>
                                        ) : (
                                            <div className="mt-0.5 font-semibold tabular-nums">
                                                {formatCompactNumber(
                                                    totals.tokens
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-xs text-muted-foreground">
                                            Requests
                                        </div>
                                        {isLoading ? (
                                            <div className="mt-1 flex justify-center">
                                                <Skeleton className="h-4 w-12 rounded-md" />
                                            </div>
                                        ) : (
                                            <div className="mt-0.5 font-semibold tabular-nums">
                                                {formatCompactNumber(
                                                    totals.requests
                                                )}
                                            </div>
                                        )}
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
                                {isLoading ? (
                                    <Skeleton className="h-48 w-full rounded-lg" />
                                ) : (
                                    <DailyUsageMultiChart
                                        series={series}
                                        metric={metric}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        <Card className="py-0 shadow-none">
                            <CardContent className="px-5 py-5">
                                <h2 className="mb-4 text-base font-semibold">
                                    Models by key
                                </h2>
                                <div className="divide-y divide-border/60">
                                    {keyList.map((k, i) => {
                                        const data = results[i]?.data
                                        const models = data?.modelSummaryList
                                            ?.slice()
                                            .sort(
                                                (a, b) =>
                                                    b.totalTokens -
                                                    a.totalTokens
                                            )
                                        const total =
                                            data?.totalUsage.totalTokensUsage ??
                                            0
                                        const color = keyColor(i)
                                        return (
                                            <div
                                                key={k.id}
                                                className="py-4 first:pt-0 last:pb-0"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <span
                                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                            style={{
                                                                background:
                                                                    color,
                                                            }}
                                                        />
                                                        <div className="truncate text-sm font-medium">
                                                            {k.name}
                                                        </div>
                                                    </div>
                                                    {isLoading && !data ? (
                                                        <Skeleton className="h-4 w-12 rounded-md" />
                                                    ) : (
                                                        <div className="text-sm font-semibold tabular-nums">
                                                            {formatCompactNumber(
                                                                total
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                {isLoading && !data ? (
                                                    <div className="mt-3 space-y-2.5 pl-5">
                                                        {Array.from({
                                                            length: 2,
                                                        }).map((_, j) => (
                                                            <div
                                                                key={j}
                                                                className="space-y-1.5"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <Skeleton className="h-3 w-24 rounded-md" />
                                                                    <Skeleton className="h-3 w-10 rounded-md" />
                                                                </div>
                                                                <Skeleton className="h-1 w-full rounded-full" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : !models ||
                                                  models.length === 0 ? (
                                                    <div className="mt-3 pl-5 text-xs text-muted-foreground">
                                                        No usage in{" "}
                                                        {rangeLabel.toLowerCase()}
                                                    </div>
                                                ) : (
                                                    <div className="mt-3 space-y-2.5 pl-5">
                                                        {models.map((m) => {
                                                            const share =
                                                                total > 0
                                                                    ? (m.totalTokens /
                                                                          total) *
                                                                      100
                                                                    : 0
                                                            const shareLabel =
                                                                share >= 1
                                                                    ? `${Math.round(share)}%`
                                                                    : share > 0
                                                                      ? "<1%"
                                                                      : "0%"
                                                            return (
                                                                <div
                                                                    key={
                                                                        m.modelName
                                                                    }
                                                                    className="space-y-1.5"
                                                                >
                                                                    <div className="flex items-center justify-between gap-3 text-[13px]">
                                                                        <div className="truncate text-muted-foreground">
                                                                            {
                                                                                m.modelName
                                                                            }
                                                                        </div>
                                                                        <div className="flex shrink-0 items-center gap-3 tabular-nums">
                                                                            <span className="w-10 text-right text-muted-foreground">
                                                                                {
                                                                                    shareLabel
                                                                                }
                                                                            </span>
                                                                            <span className="min-w-14 text-right font-medium">
                                                                                {formatCompactNumber(
                                                                                    m.totalTokens
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                                                                        <div
                                                                            className="h-full rounded-full transition-[width]"
                                                                            style={{
                                                                                width: `${Math.max(share, share > 0 ? 2 : 0)}%`,
                                                                                background:
                                                                                    color,
                                                                                opacity: 0.85,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    )
}
