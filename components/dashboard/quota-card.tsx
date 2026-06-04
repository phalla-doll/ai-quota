"use client"

import { formatDistanceToNowStrict } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactNumber } from "@/lib/format"
import { useKeyQuota, useKeyModelUsage } from "@/hooks/use-key-quota"
import type { QuotaLimit } from "@/lib/zai-monitor"
import type { ApiKey } from "@/lib/types"

function labelFor(limit: QuotaLimit): string {
    if (limit.type === "TOKENS_LIMIT") return "5-hour quota"
    if (limit.type === "TIME_LIMIT") return "Search / Reader / Zread"
    return limit.type
}

export function QuotaCard({ apiKey }: { apiKey: ApiKey }) {
    const quota = useKeyQuota(apiKey)
    const month = useKeyModelUsage(apiKey, 30)

    if (quota.isLoading) {
        return <Skeleton className="h-56 w-full rounded-xl" />
    }

    if (quota.error) {
        return (
            <Card className="py-0 shadow-none">
                <CardContent className="space-y-2 px-5 py-5 text-sm">
                    <div className="font-medium text-destructive">
                        Couldn’t read quota
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {quota.error instanceof Error
                            ? quota.error.message
                            : "unknown"}
                        . The monitor endpoint expects a Coding Plan key. If
                        this is a pay-as-you-go key, there’s no live quota to
                        show.
                    </p>
                </CardContent>
            </Card>
        )
    }

    if (!quota.data) return null

    const primary =
        quota.data.limits.find((l) => l.type === "TOKENS_LIMIT") ??
        quota.data.limits[0]
    const others = quota.data.limits.filter((l) => l !== primary)
    const totalTokens30d = month.data?.totalUsage?.totalTokensUsage ?? 0
    const totalCalls30d = month.data?.totalUsage?.totalModelCallCount ?? 0

    return (
        <Card className="py-0 shadow-none">
            <CardContent className="space-y-5 px-5 py-5">
                <div className="space-y-1 text-center">
                    <div className="text-sm text-muted-foreground">
                        {labelFor(primary)} remaining
                    </div>
                    <div className="text-4xl font-bold tracking-tight tabular-nums">
                        {100 - primary.percentage}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                        Plan{" "}
                        <span className="font-medium uppercase">
                            {quota.data.level}
                        </span>
                        {primary.nextResetTime
                            ? ` · Resets in ${formatDistanceToNowStrict(
                                  new Date(primary.nextResetTime)
                              )}`
                            : ""}
                        {quota.isFetching ? " · syncing…" : ""}
                    </div>
                </div>

                <Progress value={100 - primary.percentage} />

                {others.length > 0 && (
                    <div className="space-y-3 pt-1">
                        {others.map((l) => (
                            <div key={l.type} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                        {labelFor(l)}
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {100 - l.percentage}%
                                    </span>
                                </div>
                                <Progress value={100 - l.percentage} />
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 divide-x rounded-xl bg-muted/40">
                    <div className="px-4 py-3 text-center">
                        <div className="text-xs text-muted-foreground">
                            Tokens · 30d
                        </div>
                        <div className="mt-0.5 font-semibold tabular-nums">
                            {formatCompactNumber(totalTokens30d)}
                        </div>
                    </div>
                    <div className="px-4 py-3 text-center">
                        <div className="text-xs text-muted-foreground">
                            Requests · 30d
                        </div>
                        <div className="mt-0.5 font-semibold tabular-nums">
                            {formatCompactNumber(totalCalls30d)}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
