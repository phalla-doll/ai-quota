"use client"

import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"
import { QuotaCard } from "@/components/dashboard/quota-card"
import { useUiStore } from "@/lib/stores/ui-store"
import { keyPalette } from "@/lib/key-palette"
import { cn } from "@/lib/utils"
import type { ApiKey } from "@/lib/types"

export function QuotaCarousel({ keys }: { keys: ApiKey[] }) {
    const selectedId = useUiStore((s) => s.selectedApiKeyId)
    const setSelected = useUiStore((s) => s.setSelectedApiKeyId)

    const startIndex = Math.max(
        0,
        keys.findIndex((k) => k.id === selectedId)
    )

    const [emblaRef, emblaApi] = useEmblaCarousel({
        startIndex,
        loop: false,
        align: "start",
    })

    const [activeIndex, setActiveIndex] = React.useState(startIndex)

    React.useEffect(() => {
        if (!emblaApi) return
        const onSelect = () => {
            const idx = emblaApi.selectedScrollSnap()
            setActiveIndex(idx)
            const key = keys[idx]
            if (key && key.id !== selectedId) {
                setSelected(key.id)
            }
        }
        emblaApi.on("select", onSelect)
        return () => {
            emblaApi.off("select", onSelect)
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
        return <QuotaCard apiKey={keys[0]} color={keyPalette[0]} />
    }

    return (
        <div className="space-y-4">
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
                                color={keyPalette[i % keyPalette.length]}
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
        </div>
    )
}
