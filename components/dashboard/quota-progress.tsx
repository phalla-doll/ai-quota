"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

type QuotaProgressProps = {
    usedCents: number
    budgetCents: number
}

export function QuotaProgress({ usedCents, budgetCents }: QuotaProgressProps) {
    const pct = formatPercent(usedCents, budgetCents)
    const tone =
        pct >= 90
            ? "text-destructive"
            : pct >= 75
              ? "text-amber-600 dark:text-amber-400"
              : "text-foreground"

    return (
        <Card className="shadow-none">
            <CardContent className="space-y-3 px-4 py-4">
                <div className="flex items-end justify-between gap-2">
                    <div>
                        <div className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                            Quota
                        </div>
                        <div
                            className={cn(
                                "text-2xl font-semibold tabular-nums",
                                tone
                            )}
                        >
                            {pct}%
                        </div>
                    </div>
                    <div className="text-right text-xs tabular-nums">
                        <div className="font-medium">
                            {formatCurrency(usedCents)}{" "}
                            <span className="text-muted-foreground">
                                / {formatCurrency(budgetCents)}
                            </span>
                        </div>
                        <div className="text-muted-foreground">
                            {formatCurrency(Math.max(budgetCents - usedCents, 0))}{" "}
                            remaining
                        </div>
                    </div>
                </div>
                <Progress value={pct} />
            </CardContent>
        </Card>
    )
}
