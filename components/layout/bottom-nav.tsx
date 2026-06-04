"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    DashboardSquare01Icon,
    ChartLineData01Icon,
    // AiBrain01Icon,
    TestTube01Icon,
    Settings01Icon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

const items = [
    { href: "/", label: "Overview", icon: DashboardSquare01Icon },
    { href: "/usage", label: "Usage", icon: ChartLineData01Icon },
    { href: "/playground", label: "Playground", icon: TestTube01Icon },
    // { href: "/models", label: "Models", icon: AiBrain01Icon },
    { href: "/settings", label: "Settings", icon: Settings01Icon },
] as const

export function BottomNav() {
    const pathname = usePathname()
    return (
        <nav
            className={cn(
                "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
                "pb-[max(env(safe-area-inset-bottom),0.5rem)]"
            )}
        >
            <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-2">
                {items.map((item) => {
                    const active =
                        item.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.href)
                    return (
                        <li key={item.href} className="flex-1">
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                                    active
                                        ? "text-primary dark:text-emerald-400"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <HugeiconsIcon
                                    icon={item.icon}
                                    size={22}
                                    strokeWidth={active ? 2 : 1.6}
                                />
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
