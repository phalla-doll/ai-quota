"use client"

import { useTheme } from "next-themes"
import { AppHeader } from "@/components/layout/app-header"
import { AddKeyDrawer } from "@/components/settings/add-key-drawer"
import { ApiKeyList } from "@/components/settings/api-key-list"
import { AlertThresholds } from "@/components/settings/alert-thresholds"
import { LinkedDevices } from "@/components/settings/linked-devices"
import { SettingsSection } from "@/components/settings/section"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useTelegram } from "@/components/providers/telegram-provider"
import { useDeviceSession } from "@/hooks/use-auth-credential"

export default function SettingsPage() {
    const { resolvedTheme, setTheme } = useTheme()
    const tg = useTelegram()
    const deviceSession = useDeviceSession()
    const isDark = resolvedTheme === "dark"

    return (
        <>
            <AppHeader title="Settings" showKeySwitcher={false} />

            <div className="space-y-5 px-4 pt-3">
                <SettingsSection
                    title="API keys"
                    description="Synced to your account and cached in this browser. Validated against Z.ai on save. Coding Plan keys also unlock real quota numbers on the dashboard."
                >
                    <div className="space-y-3">
                        <AddKeyDrawer />
                        <ApiKeyList />
                    </div>
                </SettingsSection>

                <SettingsSection
                    title="Alerts"
                    description="In-app warnings when monthly usage crosses each threshold."
                >
                    <AlertThresholds />
                </SettingsSection>

                <SettingsSection
                    title="Linked devices"
                    description="Pair a browser, an installed web app, or a desktop client with a one-time code. Each gets the same keys as this account, and you can revoke any of them here."
                >
                    <LinkedDevices />
                </SettingsSection>

                <SettingsSection title="Appearance">
                    <Card className="py-0 shadow-none">
                        <CardContent className="flex items-center justify-between px-5 py-5">
                            <div>
                                <div className="font-medium">Dark mode</div>
                                <div className="text-xs text-muted-foreground">
                                    Follows your device by default
                                </div>
                            </div>
                            <Switch
                                checked={isDark}
                                onCheckedChange={(v) =>
                                    setTheme(v ? "dark" : "light")
                                }
                                aria-label="Toggle dark mode"
                            />
                        </CardContent>
                    </Card>
                </SettingsSection>

                <SettingsSection title="Account">
                    <Card className="py-0 shadow-none">
                        <CardContent className="space-y-2 px-5 py-5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Telegram
                                </span>
                                <span className="font-medium">
                                    {tg.inTelegram
                                        ? "Connected"
                                        : "Not in Telegram"}
                                </span>
                            </div>
                            {!tg.inTelegram ? (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        This browser
                                    </span>
                                    <span className="font-medium">
                                        {deviceSession
                                            ? "Linked"
                                            : "Not linked"}
                                    </span>
                                </div>
                            ) : null}
                            {tg.user ? (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        User
                                    </span>
                                    <span className="font-medium">
                                        {tg.user.firstName}
                                        {tg.user.username
                                            ? ` · @${tg.user.username}`
                                            : ""}
                                    </span>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                </SettingsSection>
            </div>
        </>
    )
}
