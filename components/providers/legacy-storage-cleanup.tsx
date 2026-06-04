"use client"

import * as React from "react"

const DONE_FLAG = "zai-tracker-cleanup-v1"

export function LegacyStorageCleanup() {
    React.useEffect(() => {
        try {
            if (localStorage.getItem(DONE_FLAG)) return
            localStorage.removeItem("zai-tracker-alerts")
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i)
                if (k?.startsWith("zai:events:")) localStorage.removeItem(k)
            }
            localStorage.setItem(DONE_FLAG, "1")
        } catch {}
    }, [])
    return null
}
