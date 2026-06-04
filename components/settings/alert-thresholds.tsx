"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useAlertsStore, ALL_THRESHOLDS } from "@/lib/stores/alerts-store"

export function AlertThresholds() {
    const enabled = useAlertsStore((s) => s.enabled)
    const toggle = useAlertsStore((s) => s.toggle)

    return (
        <Card className="py-0 shadow-none">
            <CardContent className="divide-y divide-border/60 px-0 py-3">
                {ALL_THRESHOLDS.map((t) => (
                    <div
                        key={t}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                        <div>
                            <div className="font-medium">{t}% used</div>
                            <div className="text-xs text-muted-foreground">
                                In-app toast when any key crosses {t}%
                            </div>
                        </div>
                        <Switch
                            checked={enabled[t]}
                            onCheckedChange={() => toggle(t)}
                            aria-label={`Toggle ${t}% alert`}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
