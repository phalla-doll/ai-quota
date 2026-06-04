"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useAlertsStore } from "@/lib/stores/alerts-store"
import type { AlertThreshold } from "@/lib/types"

const thresholds: AlertThreshold[] = [50, 75, 90, 95]

export function AlertThresholds() {
    const map = useAlertsStore((s) => s.thresholds)
    const toggle = useAlertsStore((s) => s.toggle)

    return (
        <Card className="shadow-none py-0">
            <CardContent className="divide-border/60 divide-y px-0 py-0">
                {thresholds.map((t) => (
                    <div
                        key={t}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                        <div>
                            <div className="font-medium">{t}% used</div>
                            <div className="text-muted-foreground text-xs">
                                Telegram alert when quota crosses {t}%
                            </div>
                        </div>
                        <Switch
                            checked={map[t]}
                            onCheckedChange={() => toggle(t)}
                            aria-label={`Toggle ${t}% alert`}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
