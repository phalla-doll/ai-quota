"use client"

import * as React from "react"

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
                const mod = await import("@telegram-apps/sdk-react")
                if (cancelled) return

                if (typeof window === "undefined") return

                mod.init()

                const launch = mod.retrieveLaunchParams()
                const tgUser = launch.tgWebAppData?.user
                const raw =
                    typeof launch.tgWebAppData === "string"
                        ? launch.tgWebAppData
                        : null

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
                    colorScheme: launch.tgWebAppThemeParams
                        ? document.documentElement.classList.contains("dark")
                            ? "dark"
                            : "light"
                        : "light",
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
    }, [])

    return (
        <TelegramContext.Provider value={value}>
            {children}
        </TelegramContext.Provider>
    )
}
