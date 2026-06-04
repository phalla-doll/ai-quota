"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useAlertsStore, ALL_THRESHOLDS } from "@/lib/stores/alerts-store"
import { useApiKeys, useSelectedApiKey } from "@/hooks/use-api-keys"

export function AlertThresholds() {
    const { data: keys } = useApiKeys()
    const selected = useSelectedApiKey()
    const enabled = useAlertsStore((s) =>
        selected ? s.enabled[selected.id] : undefined
    )
    const toggle = useAlertsStore((s) => s.toggle)

    if (!keys || keys.length === 0) {
        return (
            <Card className="py-0 shadow-none">
                <CardContent className="px-5 py-6 text-center text-sm text-muted-foreground">
                    Add an API key to configure alerts.
                </CardContent>
            </Card>
        )
    }

    if (!selected) return null

    const getEnabled = (t: (typeof ALL_THRESHOLDS)[number]) =>
        enabled?.[t] ?? (t === 50 ? false : true)

    return (
        <Card className="py-0 shadow-none">
            <CardContent className="divide-y divide-border/60 px-0 py-3">
                <div className="px-5 py-2 text-xs text-muted-foreground">
                    For <span className="font-medium">{selected.name}</span>
                </div>
                {ALL_THRESHOLDS.map((t) => (
                    <div
                        key={t}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                        <div>
                            <div className="font-medium">{t}% used</div>
                            <div className="text-xs text-muted-foreground">
                                In-app toast when monthly usage crosses {t}%
                            </div>
                        </div>
                        <Switch
                            checked={getEnabled(t)}
                            onCheckedChange={() => toggle(selected.id, t)}
                            aria-label={`Toggle ${t}% alert`}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
