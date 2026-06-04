"use client"

import * as React from "react"

const VAUL_OPEN_SELECTOR = '[data-vaul-drawer][data-state="open"]'

function clearStuckLock() {
    if (typeof document === "undefined") return
    if (document.querySelector(VAUL_OPEN_SELECTOR)) return

    const html = document.documentElement
    const body = document.body

    if (html.hasAttribute("data-scroll-locked")) {
        html.removeAttribute("data-scroll-locked")
    }
    if (body.hasAttribute("data-scroll-locked")) {
        body.removeAttribute("data-scroll-locked")
    }
    if (html.style.overflow === "hidden") html.style.overflow = ""
    if (body.style.overflow === "hidden") body.style.overflow = ""
    if (body.style.pointerEvents === "none") body.style.pointerEvents = ""
}

export function ScrollLockGuardian() {
    React.useEffect(() => {
        const observer = new MutationObserver(() => {
            window.setTimeout(clearStuckLock, 350)
        })

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-scroll-locked", "style"],
        })
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["data-scroll-locked", "style"],
        })

        const interval = window.setInterval(clearStuckLock, 1500)

        return () => {
            observer.disconnect()
            window.clearInterval(interval)
        }
    }, [])

    return null
}
