"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

type OverallCardProps = {
    remainingCents: number
    usedCents: number
    budgetCents: number
}

export function OverallCard({
    remainingCents,
    usedCents,
    budgetCents,
}: OverallCardProps) {
    return (
        <Card className="shadow-none py-0">
            <CardContent className="space-y-5 px-5 py-5">
                <div className="space-y-1 text-center">
                    <div className="text-muted-foreground text-sm">
                        Used this month
                    </div>
                    <div className="text-4xl font-bold tracking-tight tabular-nums">
                        {budgetCents > 0
                            ? Math.round((usedCents / budgetCents) * 100)
                            : 0}
                        %
                    </div>
                    <div className="text-muted-foreground text-sm">
                        <span className="text-primary font-medium">
                            {formatCurrency(usedCents)}
                        </span>{" "}
                        <span className="opacity-60">·</span>{" "}
                        {formatCurrency(remainingCents)} left
                    </div>
                </div>

                <Button asChild size="xl" className="w-full">
                    <Link href="/usage">View usage</Link>
                </Button>

                <div className="bg-muted/40 grid grid-cols-2 divide-x rounded-xl">
                    <div className="px-4 py-3 text-center">
                        <div className="text-muted-foreground text-xs">
                            Monthly Budget
                        </div>
                        <div className="mt-0.5 font-semibold tabular-nums">
                            {formatCurrency(budgetCents)}
                        </div>
                    </div>
                    <div className="px-4 py-3 text-center">
                        <div className="text-muted-foreground text-xs">
                            Remaining
                        </div>
                        <div className="mt-0.5 font-semibold tabular-nums">
                            {formatCurrency(remainingCents)}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
