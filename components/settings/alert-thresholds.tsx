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
            <Card className="shadow-none py-0">
                <CardContent className="text-muted-foreground px-5 py-6 text-center text-sm">
                    Add an API key to configure alerts.
                </CardContent>
            </Card>
        )
    }

    if (!selected) return null

    const getEnabled = (t: (typeof ALL_THRESHOLDS)[number]) =>
        enabled?.[t] ?? (t === 50 ? false : true)

    return (
        <Card className="shadow-none py-0">
            <CardContent className="divide-border/60 divide-y px-0 py-2">
                <div className="text-muted-foreground px-5 pb-2 pt-1 text-xs">
                    For <span className="font-medium">{selected.name}</span>
                </div>
                {ALL_THRESHOLDS.map((t) => (
                    <div
                        key={t}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                        <div>
                            <div className="font-medium">{t}% used</div>
                            <div className="text-muted-foreground text-xs">
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
