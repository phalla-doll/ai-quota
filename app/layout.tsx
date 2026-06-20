import type { Metadata, Viewport } from "next"
import { Geist_Mono } from "next/font/google"
import localFont from "next/font/local"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { TelegramProvider } from "@/components/providers/telegram-provider"
import { ScrollLockGuardian } from "@/components/providers/scroll-lock-guardian"
import { LegacyStorageCleanup } from "@/components/providers/legacy-storage-cleanup"
import { KeyMigration } from "@/components/providers/key-migration"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const sunghyun = localFont({
    variable: "--font-sans-custom",
    display: "swap",
    preload: false,
    src: [
        {
            path: "./fonts/SunghyunSans-Regular.woff2",
            weight: "400",
            style: "normal",
        },
        {
            path: "./fonts/SunghyunSans-Medium.woff2",
            weight: "500",
            style: "normal",
        },
        {
            path: "./fonts/SunghyunSans-SemiBold.woff2",
            weight: "600",
            style: "normal",
        },
        {
            path: "./fonts/SunghyunSans-Bold.woff2",
            weight: "700",
            style: "normal",
        },
    ],
})

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
                sunghyun.variable,
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
                        <TelegramProvider>
                            <KeyMigration />
                            {children}
                        </TelegramProvider>
                    </QueryProvider>
                </ThemeProvider>
                <ScrollLockGuardian />
                <LegacyStorageCleanup />
                <Toaster position="top-center" />
            </body>
        </html>
    )
}
