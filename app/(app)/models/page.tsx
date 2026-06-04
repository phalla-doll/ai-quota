"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { AppHeader } from "@/components/layout/app-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSelectedApiKey } from "@/hooks/use-api-keys"
import { useModelUsage } from "@/hooks/use-usage"
import {
    formatCompactNumber,
    formatCurrency,
    formatTokens,
} from "@/lib/format"

const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
]

export default function ModelsPage() {
    const selected = useSelectedApiKey()
    const { data, isLoading } = useModelUsage(selected?.id)

    const sorted = data?.slice().sort((a, b) => b.costCents - a.costCents) ?? []
    const totalCost = sorted.reduce((s, m) => s + m.costCents, 0)
    const totalTokens = sorted.reduce((s, m) => s + m.tokens, 0)
    const totalRequests = sorted.reduce((s, m) => s + m.requests, 0)

    return (
        <>
            <AppHeader title="Models" subtitle={selected?.name} />

            <div className="space-y-4 px-4 pt-3">
                {isLoading || !data ? (
                    <>
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </>
                ) : (
                    <>
                        <Card className="shadow-none py-0">
                            <CardContent className="space-y-5 px-5 py-5">
                                <div className="space-y-1 text-center">
                                    <div className="text-muted-foreground text-sm">
                                        Spend across models
                                    </div>
                                    <div className="text-4xl font-bold tracking-tight tabular-nums">
                                        {formatCurrency(totalCost)}
                                    </div>
                                    <div className="text-muted-foreground text-sm">
                                        {sorted.length} models active
                                    </div>
                                </div>
                                <div className="bg-muted/40 grid grid-cols-2 divide-x rounded-xl">
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-muted-foreground text-xs">
                                            Tokens
                                        </div>
                                        <div className="mt-0.5 font-semibold tabular-nums">
                                            {formatTokens(totalTokens)}
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 text-center">
                                        <div className="text-muted-foreground text-xs">
                                            Requests
                                        </div>
                                        <div className="mt-0.5 font-semibold tabular-nums">
                                            {formatCompactNumber(totalRequests)}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-none py-0">
                            <CardContent className="divide-border/60 divide-y px-5 py-2">
                                {sorted.map((m, i) => {
                                    const share =
                                        totalCost > 0
                                            ? Math.round(
                                                  (m.costCents / totalCost) *
                                                      100
                                              )
                                            : 0
                                    return (
                                        <div
                                            key={m.model}
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
                                                        {m.model}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">
                                                        {formatCompactNumber(
                                                            m.requests
                                                        )}{" "}
                                                        req ·{" "}
                                                        {formatTokens(m.tokens)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold tabular-nums">
                                                        {formatCurrency(
                                                            m.costCents
                                                        )}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs tabular-nums">
                                                        {share}%
                                                    </div>
                                                </div>
                                                <HugeiconsIcon
                                                    icon={ArrowRight01Icon}
                                                    size={16}
                                                    className="text-muted-foreground"
                                                />
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
