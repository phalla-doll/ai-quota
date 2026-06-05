"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type PopNumberProps = {
    value: string
    className?: string
}

export function PopNumber({ value, className }: PopNumberProps) {
    const groupRef = React.useRef<HTMLSpanElement | null>(null)
    const lastValue = React.useRef<string | null>(null)

    React.useLayoutEffect(() => {
        const group = groupRef.current
        if (!group) return
        if (lastValue.current === value) return
        lastValue.current = value
        group.classList.remove("is-animating")
        // force reflow so the next class add re-triggers the keyframe
        void group.offsetWidth
        group.classList.add("is-animating")
    }, [value])

    const chars = React.useMemo(() => value.split(""), [value])
    const lastIdx = chars.length - 1
    const secondLastIdx = chars.length - 2

    return (
        <span
            ref={groupRef}
            className={cn("t-digit-group", className)}
            aria-label={value}
        >
            {chars.map((ch, i) => {
                const stagger =
                    i === secondLastIdx ? "1" : i === lastIdx ? "2" : undefined
                return (
                    <span
                        key={`${i}-${ch}`}
                        className="t-digit"
                        data-stagger={stagger}
                        aria-hidden="true"
                    >
                        {ch}
                    </span>
                )
            })}
        </span>
    )
}
