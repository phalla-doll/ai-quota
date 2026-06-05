"use client"

import { AppHeader } from "@/components/layout/app-header"
import { QuotaCarousel } from "@/components/dashboard/quota-carousel"
import { ModelBreakdownCard } from "@/components/dashboard/model-breakdown-card"
import { NoApiKeyState } from "@/components/dashboard/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiKeys, useSelectedApiKey } from "@/hooks/use-api-keys"

export default function DashboardPage() {
    const { data: keys, isLoading: keysLoading } = useApiKeys()
    const selected = useSelectedApiKey()

    const hasKeys = (keys?.length ?? 0) > 0

    return (
        <>
            <AppHeader
                title="Overview"
                subtitle="Across all your API keys"
                rightAction="add"
            />

            <div className="space-y-4 px-4 pt-3">
                {keysLoading ? (
                    <>
                        <Skeleton className="h-56 w-full rounded-2xl" />
                        <Skeleton className="h-[27rem] w-full rounded-2xl" />
                    </>
                ) : !hasKeys || !selected ? (
                    <NoApiKeyState />
                ) : (
                    <>
                        {keys!.length > 1 ? (
                            <>
                                <ModelBreakdownCard keys={keys!} />
                                <QuotaCarousel keys={keys!} />
                            </>
                        ) : (
                            <>
                                <QuotaCarousel keys={keys!} />
                                <ModelBreakdownCard keys={keys!} />
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    )
}
