"use client"

import { AppHeader } from "@/components/layout/app-header"
import { QuotaCarousel } from "@/components/dashboard/quota-carousel"
import { ModelBreakdownCard } from "@/components/dashboard/model-breakdown-card"
import { NoApiKeyState } from "@/components/dashboard/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiKeys, useSelectedApiKey } from "@/hooks/use-api-keys"
import { useUiStore } from "@/lib/stores/ui-store"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
    const { data: keys, isLoading: keysLoading } = useApiKeys()
    const selected = useSelectedApiKey()
    const widget = useUiStore((s) => s.widgetMode)

    const hasKeys = (keys?.length ?? 0) > 0
    // Widget mode strips the page down to the quota list: no page header, no
    // breakdown card (and AppShell drops the bottom nav), so the card sits
    // alone at the top of the viewport.
    const widgetView = widget && hasKeys && !!selected && !keysLoading

    return (
        <>
            {widgetView ? null : (
                <AppHeader
                    title="Overview"
                    subtitle="Across all your API keys"
                    rightAction="add"
                />
            )}

            <div
                className={cn(
                    "space-y-4 px-4",
                    widgetView
                        ? "pt-[max(calc(env(safe-area-inset-top)+0.75rem),1rem)]"
                        : "pt-3"
                )}
            >
                {keysLoading ? (
                    <>
                        <Skeleton className="h-56 w-full rounded-2xl" />
                        <Skeleton className="h-[27rem] w-full rounded-2xl" />
                    </>
                ) : !hasKeys || !selected ? (
                    <NoApiKeyState />
                ) : (
                    <>
                        <QuotaCarousel keys={keys!} title="Quota by key" />
                        {widgetView ? null : (
                            <ModelBreakdownCard keys={keys!} />
                        )}
                    </>
                )}
            </div>
        </>
    )
}
