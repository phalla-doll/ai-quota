import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type StatCardProps = {
    label: string
    value: string
    sub?: string
    accent?: "default" | "primary" | "muted"
    className?: string
}

export function StatCard({
    label,
    value,
    sub,
    accent = "default",
    className,
}: StatCardProps) {
    return (
        <Card
            className={cn(
                "shadow-none",
                accent === "primary" && "border-primary/20 bg-primary/5",
                accent === "muted" && "bg-muted/40",
                className
            )}
        >
            <CardContent className="px-4 py-3">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {label}
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums">
                    {value}
                </div>
                {sub ? (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {sub}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}
