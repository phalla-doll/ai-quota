"use client"

import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    ArrowLeft02Icon,
    ArrowRight02Icon,
    LayoutGridIcon,
    LeftToRightListBulletIcon,
} from "@hugeicons/core-free-icons"
import { QuotaCard } from "@/components/dashboard/quota-card"
import { QuotaCompactList } from "@/components/dashboard/quota-compact-list"
import { useUiStore } from "@/lib/stores/ui-store"
import { keyPalette } from "@/lib/key-palette"
import { cn } from "@/lib/utils"
import type { ApiKey } from "@/lib/types"

export function QuotaCarousel({
    keys,
    title,
}: {
    keys: ApiKey[]
    title?: string
}) {
    const selectedId = useUiStore((s) => s.selectedApiKeyId)
    const setSelected = useUiStore((s) => s.setSelectedApiKeyId)
    const compact = useUiStore((s) => s.quotaCompactMode)
    const setCompact = useUiStore((s) => s.setQuotaCompactMode)

    const startIndex = Math.max(
        0,
        keys.findIndex((k) => k.id === selectedId)
    )

    const [emblaRef, emblaApi] = useEmblaCarousel({
        startIndex,
        loop: false,
        align: "start",
        dragFree: true,
        containScroll: "trimSnaps",
        duration: 32,
    })

    const [activeIndex, setActiveIndex] = React.useState(startIndex)
    const [canPrev, setCanPrev] = React.useState(false)
    const [canNext, setCanNext] = React.useState(false)

    React.useEffect(() => {
        if (!emblaApi) return
        const sync = () => {
            const idx = emblaApi.selectedScrollSnap()
            setActiveIndex(idx)
            setCanPrev(emblaApi.canScrollPrev())
            setCanNext(emblaApi.canScrollNext())
            const key = keys[idx]
            if (key && key.id !== selectedId) {
                setSelected(key.id)
            }
        }
        sync()
        emblaApi.on("select", sync)
        emblaApi.on("reInit", sync)
        return () => {
            emblaApi.off("select", sync)
            emblaApi.off("reInit", sync)
        }
    }, [emblaApi, keys, selectedId, setSelected])

    React.useEffect(() => {
        if (!emblaApi) return
        const idx = keys.findIndex((k) => k.id === selectedId)
        if (idx >= 0 && idx !== emblaApi.selectedScrollSnap()) {
            emblaApi.scrollTo(idx)
        }
    }, [emblaApi, keys, selectedId])

    if (keys.length === 1) {
        return (
            <div className="space-y-2">
                {title ? (
                    <h2 className="px-1 text-base font-semibold">{title}</h2>
                ) : null}
                <QuotaCard apiKey={keys[0]} color={keyPalette[0]} />
            </div>
        )
    }

    const toggle = (
        <button
            type="button"
            aria-label={
                compact ? "Switch to carousel view" : "Switch to compact view"
            }
            aria-pressed={compact}
            onClick={() => setCompact(!compact)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:text-foreground active:scale-90"
        >
            <HugeiconsIcon
                icon={compact ? LayoutGridIcon : LeftToRightListBulletIcon}
                size={14}
            />
        </button>
    )

    return (
        <div className="space-y-2">
            {title ? (
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-base font-semibold">{title}</h2>
                    <div className="flex items-center gap-1">
                        {!compact && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Previous key"
                                    onClick={() => emblaApi?.scrollPrev()}
                                    disabled={!canPrev}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:text-foreground active:scale-90 disabled:opacity-40 disabled:active:scale-100"
                                >
                                    <HugeiconsIcon
                                        icon={ArrowLeft02Icon}
                                        size={14}
                                    />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next key"
                                    onClick={() => emblaApi?.scrollNext()}
                                    disabled={!canNext}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:text-foreground active:scale-90 disabled:opacity-40 disabled:active:scale-100"
                                >
                                    <HugeiconsIcon
                                        icon={ArrowRight02Icon}
                                        size={14}
                                    />
                                </button>
                            </>
                        )}
                        {toggle}
                    </div>
                </div>
            ) : null}
            {compact ? (
                <QuotaCompactList keys={keys} />
            ) : (
                <>
                    <div
                        className="-my-2 -mr-4 -ml-2 overflow-hidden py-2 pl-2"
                        ref={emblaRef}
                    >
                        <div className="flex">
                            {keys.map((k, i) => (
                                <div
                                    key={k.id}
                                    className="min-w-0 shrink-0 grow-0 basis-[92%] pr-3"
                                >
                                    <QuotaCard
                                        apiKey={k}
                                        color={
                                            keyPalette[i % keyPalette.length]
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-center gap-1.5 pt-2">
                        {keys.map((k, i) => (
                            <button
                                key={k.id}
                                type="button"
                                aria-label={`Go to ${k.name}`}
                                onClick={() => emblaApi?.scrollTo(i)}
                                className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    i === activeIndex
                                        ? "w-4 bg-primary"
                                        : "w-1.5 bg-muted-foreground/30"
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
