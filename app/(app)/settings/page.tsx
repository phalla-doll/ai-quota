"use client"

import { useTheme } from "next-themes"
import { AppHeader } from "@/components/layout/app-header"
import { AddKeyDrawer } from "@/components/settings/add-key-drawer"
import { ApiKeyList } from "@/components/settings/api-key-list"
import { AlertThresholds } from "@/components/settings/alert-thresholds"
import { SettingsSection } from "@/components/settings/section"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useTelegram } from "@/components/providers/telegram-provider"

export default function SettingsPage() {
    const { resolvedTheme, setTheme } = useTheme()
    const tg = useTelegram()
    const isDark = resolvedTheme === "dark"

    return (
        <>
            <AppHeader title="Settings" showKeySwitcher={false} />

            <div className="space-y-5 px-4 pt-3">
                <SettingsSection
                    title="API keys"
                    description="Stored encrypted. Used to read Z AI usage."
                >
                    <div className="space-y-3">
                        <AddKeyDrawer />
                        <ApiKeyList />
                    </div>
                </SettingsSection>

                <SettingsSection
                    title="Notifications"
                    description="Telegram alerts when monthly usage crosses each threshold."
                >
                    <AlertThresholds />
                </SettingsSection>

                <SettingsSection title="Appearance">
                    <Card className="shadow-none">
                        <CardContent className="flex items-center justify-between px-5 py-4">
                            <div>
                                <div className="font-medium">Dark mode</div>
                                <div className="text-muted-foreground text-xs">
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
                    <Card className="shadow-none">
                        <CardContent className="space-y-2 px-5 py-4 text-sm">
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
