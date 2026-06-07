"use client"

import { formatDistanceToNowStrict } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useKeyQuota } from "@/hooks/use-key-quota"
import { useUiStore } from "@/lib/stores/ui-store"
import { keyPalette } from "@/lib/key-palette"
import { cn } from "@/lib/utils"
import type { ApiKey } from "@/lib/types"

function quotaToneClass(remaining: number): string {
    if (remaining >= 75) return "bg-emerald-500"
    if (remaining >= 25) return "bg-amber-500"
    return "bg-red-500"
}

function CompactRow({
    apiKey,
    color,
    selected,
    onSelect,
}: {
    apiKey: ApiKey
    color: string
    selected: boolean
    onSelect: () => void
}) {
    const quota = useKeyQuota(apiKey)
    const primary =
        quota.data?.limits.find((l) => l.type === "TOKENS_LIMIT") ??
        quota.data?.limits[0]
    const remaining = primary ? 100 - primary.percentage : null
    const reset = primary?.nextResetTime
        ? formatDistanceToNowStrict(new Date(primary.nextResetTime))
        : null

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "flex w-full flex-col gap-2 px-5 py-4 text-left transition-colors",
                selected ? "bg-muted/40" : "hover:bg-muted/20"
            )}
        >
            <div className="flex items-center gap-3">
                <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm leading-tight font-medium">
                        {apiKey.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {quota.isLoading || !quota.data ? (
                            <Skeleton className="inline-block h-3 w-32 rounded" />
                        ) : (
                            <>
                                Plan{" "}
                                <span className="font-medium uppercase">
                                    {quota.data.level}
                                </span>
                                {reset ? ` · Resets in ${reset}` : ""}
                            </>
                        )}
                    </div>
                </div>
                <div className="text-base font-semibold tabular-nums">
                    {remaining === null ? (
                        <Skeleton className="h-5 w-10 rounded" />
                    ) : (
                        `${remaining}%`
                    )}
                </div>
            </div>
            {remaining === null ? (
                <Skeleton className="h-2 w-full rounded-full" />
            ) : (
                <Progress
                    value={remaining}
                    className="h-2"
                    indicatorClassName={quotaToneClass(remaining)}
                />
            )}
        </button>
    )
}

export function QuotaCompactList({ keys }: { keys: ApiKey[] }) {
    const selectedId = useUiStore((s) => s.selectedApiKeyId)
    const setSelected = useUiStore((s) => s.setSelectedApiKeyId)

    return (
        <Card className="overflow-hidden py-0 shadow-none">
            <CardContent className="px-0 py-2">
                <div className="divide-y">
                    {keys.map((k, i) => (
                        <CompactRow
                            key={k.id}
                            apiKey={k}
                            color={keyPalette[i % keyPalette.length]}
                            selected={k.id === selectedId}
                            onSelect={() => setSelected(k.id)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
