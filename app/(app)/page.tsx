"use client"

import { AppHeader } from "@/components/layout/app-header"
import { OverallCard } from "@/components/dashboard/overall-card"
import { IncomeDonut } from "@/components/dashboard/income-donut"
import { ForecastCard } from "@/components/dashboard/forecast-card"
import { NoApiKeyState } from "@/components/dashboard/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiKeys, useSelectedApiKey } from "@/hooks/use-api-keys"
import { useModelUsage, useUsageSummary } from "@/hooks/use-usage"

export default function DashboardPage() {
    const { data: keys, isLoading: keysLoading } = useApiKeys()
    const selected = useSelectedApiKey()
    const { data: summary, isLoading } = useUsageSummary(selected?.id)
    const { data: models, isLoading: modelsLoading } = useModelUsage(
        selected?.id
    )

    const hasKeys = (keys?.length ?? 0) > 0
    const remainingCents = summary
        ? Math.max(summary.monthlyBudgetCents - summary.usedCents, 0)
        : 0

    return (
        <>
            <AppHeader
                title="Usage"
                subtitle={selected?.name ?? "No key selected"}
                showKeySwitcher={hasKeys}
            />

            <div className="space-y-4 px-4 pt-3">
                {keysLoading ? (
                    <>
                        <Skeleton className="h-56 w-full rounded-xl" />
                        <Skeleton className="h-72 w-full rounded-xl" />
                    </>
                ) : !hasKeys ? (
                    <NoApiKeyState />
                ) : (
                    <>
                        {isLoading || !summary ? (
                            <Skeleton className="h-56 w-full rounded-xl" />
                        ) : (
                            <OverallCard
                                remainingCents={remainingCents}
                                usedCents={summary.usedCents}
                                budgetCents={summary.monthlyBudgetCents}
                            />
                        )}

                        {modelsLoading || !models ? (
                            <Skeleton className="h-80 w-full rounded-xl" />
                        ) : (
                            <IncomeDonut models={models} />
                        )}

                        {summary ? (
                            <ForecastCard
                                usedCents={summary.usedCents}
                                budgetCents={summary.monthlyBudgetCents}
                                capturedAt={summary.capturedAt}
                            />
                        ) : null}
                    </>
                )}
            </div>
        </>
    )
}
