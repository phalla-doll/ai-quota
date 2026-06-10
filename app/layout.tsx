import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { TelegramProvider } from "@/components/providers/telegram-provider"
import { ScrollLockGuardian } from "@/components/providers/scroll-lock-guardian"
import { LegacyStorageCleanup } from "@/components/providers/legacy-storage-cleanup"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })

const fontMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
})

export const metadata: Metadata = {
    title: "Z AI Quota Tracker",
    description: "Monitor your Z AI API usage from Telegram",
    applicationName: "Z AI Quota Tracker",
    appleWebApp: {
        capable: true,
        title: "Z Quota",
        statusBarStyle: "black-translucent",
    },
    formatDetection: {
        telephone: false,
    },
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    ],
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn(
                "antialiased",
                fontMono.variable,
                geist.variable,
                "font-sans"
            )}
        >
            <body className="min-h-svh overscroll-none bg-background">
                <Script
                    src="https://telegram.org/js/telegram-web-app.js"
                    strategy="beforeInteractive"
                />
                <ThemeProvider>
                    <QueryProvider>
                        <TelegramProvider>{children}</TelegramProvider>
                    </QueryProvider>
                </ThemeProvider>
                <ScrollLockGuardian />
                <LegacyStorageCleanup />
                <Toaster position="top-center" />
            </body>
        </html>
    )
}
