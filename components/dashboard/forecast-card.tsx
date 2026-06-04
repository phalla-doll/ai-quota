"use client"

import { Card, CardContent } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnalyticsUpIcon } from "@hugeicons/core-free-icons"
import { formatCurrency } from "@/lib/format"

type ForecastCardProps = {
    usedCents: number
    budgetCents: number
    capturedAt: string
}

function projectMonth(usedCents: number, capturedAt: string): number {
    const now = new Date(capturedAt)
    const day = now.getDate()
    const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
    ).getDate()
    if (day === 0) return usedCents
    return Math.round((usedCents / day) * daysInMonth)
}

export function ForecastCard({
    usedCents,
    budgetCents,
    capturedAt,
}: ForecastCardProps) {
    const projected = projectMonth(usedCents, capturedAt)
    const overBudget = projected > budgetCents

    return (
        <Card className="shadow-none">
            <CardContent className="px-4 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                            Spending forecast
                        </div>
                        <div className="mt-1 text-2xl font-semibold tabular-nums">
                            {formatCurrency(projected)}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-xs">
                            Projected for this month
                        </div>
                    </div>
                    <div
                        className={
                            overBudget
                                ? "text-destructive"
                                : "text-emerald-600 dark:text-emerald-400"
                        }
                    >
                        <HugeiconsIcon icon={AnalyticsUpIcon} size={28} />
                    </div>
                </div>
                <div className="border-border/60 mt-3 flex justify-between border-t pt-3 text-xs tabular-nums">
                    <div>
                        <div className="text-muted-foreground">Current</div>
                        <div className="font-medium">
                            {formatCurrency(usedCents)}
                        </div>
                    </div>
                    <div>
                        <div className="text-muted-foreground">Budget</div>
                        <div className="font-medium">
                            {formatCurrency(budgetCents)}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-muted-foreground">Delta</div>
                        <div
                            className={
                                overBudget
                                    ? "text-destructive font-medium"
                                    : "font-medium text-emerald-600 dark:text-emerald-400"
                            }
                        >
                            {overBudget ? "+" : "−"}
                            {formatCurrency(Math.abs(projected - budgetCents))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
