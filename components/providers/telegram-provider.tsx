"use client"

import * as React from "react"
import { useTheme } from "next-themes"

const THEME_STORAGE_KEY = "theme"

type TelegramUser = {
    id: number
    firstName: string
    lastName?: string
    username?: string
    photoUrl?: string
}

type TelegramContextValue = {
    ready: boolean
    inTelegram: boolean
    user: TelegramUser | null
    initDataRaw: string | null
    colorScheme: "light" | "dark"
}

const TelegramContext = React.createContext<TelegramContextValue>({
    ready: false,
    inTelegram: false,
    user: null,
    initDataRaw: null,
    colorScheme: "light",
})

export function useTelegram() {
    return React.useContext(TelegramContext)
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
    const { setTheme } = useTheme()
    const [value, setValue] = React.useState<TelegramContextValue>({
        ready: false,
        inTelegram: false,
        user: null,
        initDataRaw: null,
        colorScheme: "light",
    })

    React.useEffect(() => {
        let cancelled = false

        async function init() {
            try {
                if (typeof window === "undefined") return

                const mod = await import("@telegram-apps/sdk-react")
                if (cancelled) return

                mod.init()

                const launch = mod.retrieveLaunchParams()
                const tgUser = launch.tgWebAppData?.user

                let raw: string | null = null
                try {
                    const rawWin = (
                        window as unknown as {
                            Telegram?: { WebApp?: { initData?: string } }
                        }
                    ).Telegram?.WebApp?.initData
                    if (typeof rawWin === "string" && rawWin.length > 0) {
                        raw = rawWin
                    }
                } catch {
                    raw = null
                }

                try {
                    const webApp = (
                        window as unknown as {
                            Telegram?: {
                                WebApp?: {
                                    ready?: () => void
                                    expand?: () => void
                                    enableClosingConfirmation?: () => void
                                }
                            }
                        }
                    ).Telegram?.WebApp
                    webApp?.ready?.()
                    webApp?.expand?.()
                } catch {
                    /* noop */
                }

                const tgColorScheme: "light" | "dark" =
                    launch.tgWebAppThemeParams?.bg_color &&
                    isDarkHex(launch.tgWebAppThemeParams.bg_color)
                        ? "dark"
                        : "light"

                // Only seed from Telegram if the user has never picked a theme.
                // Otherwise this would clobber their saved choice every launch
                // and make the dark-mode toggle appear broken in Telegram.
                let hasStoredPreference = false
                try {
                    hasStoredPreference =
                        window.localStorage.getItem(THEME_STORAGE_KEY) !== null
                } catch {
                    hasStoredPreference = false
                }
                if (!hasStoredPreference) {
                    setTheme(tgColorScheme)
                }

                setValue({
                    ready: true,
                    inTelegram: true,
                    user: tgUser
                        ? {
                              id: tgUser.id,
                              firstName: tgUser.first_name,
                              lastName: tgUser.last_name,
                              username: tgUser.username,
                              photoUrl: tgUser.photo_url,
                          }
                        : null,
                    initDataRaw: raw,
                    colorScheme: tgColorScheme,
                })
            } catch {
                if (cancelled) return
                setValue((prev) => ({
                    ...prev,
                    ready: true,
                    inTelegram: false,
                    user:
                        process.env.NODE_ENV === "development"
                            ? {
                                  id: 1,
                                  firstName: "Dev",
                                  username: "dev",
                              }
                            : null,
                }))
            }
        }

        init()

        return () => {
            cancelled = true
        }
    }, [setTheme])

    return (
        <TelegramContext.Provider value={value}>
            {children}
        </TelegramContext.Provider>
    )
}

function isDarkHex(hex: string): boolean {
    const m = hex.replace("#", "")
    if (m.length !== 6) return false
    const r = parseInt(m.slice(0, 2), 16)
    const g = parseInt(m.slice(2, 4), 16)
    const b = parseInt(m.slice(4, 6), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.5
}
