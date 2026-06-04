"use client"

import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Sent02Icon } from "@hugeicons/core-free-icons"
import { AppHeader } from "@/components/layout/app-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PickerDrawer } from "@/components/ui/picker-drawer"
import { NoApiKeyState } from "@/components/dashboard/empty-state"
import { useApiKeys, useSelectedApiKey } from "@/hooks/use-api-keys"
import { useChatCompletion } from "@/hooks/use-chat-completion"
import { useQuery } from "@tanstack/react-query"
import { listModels } from "@/lib/zai-client"
import { KNOWN_MODELS } from "@/lib/zai-pricing"
import { formatCurrency, formatNumber } from "@/lib/format"

function useAvailableModels() {
    const selected = useSelectedApiKey()
    return useQuery({
        queryKey: ["zai", "models", selected?.id],
        enabled: Boolean(selected),
        staleTime: 5 * 60_000,
        queryFn: async () => {
            try {
                const models = await listModels({
                    key: selected!.key,
                    endpoint: selected!.endpoint,
                })
                const ids = models.map((m) => m.id)
                return ids.length > 0 ? ids : KNOWN_MODELS
            } catch {
                return KNOWN_MODELS
            }
        },
    })
}

export default function PlaygroundPage() {
    const { data: keys, isLoading: keysLoading } = useApiKeys()
    const selected = useSelectedApiKey()
    const { data: models, isLoading: modelsLoading } = useAvailableModels()
    const send = useChatCompletion()

    const [chosenModel, setChosenModel] = React.useState<string>("")
    const [systemPrompt, setSystemPrompt] = React.useState("")
    const [userPrompt, setUserPrompt] = React.useState(
        "Reply with a single short sentence."
    )
    const [streaming, setStreaming] = React.useState("")
    const [lastResult, setLastResult] = React.useState<{
        tokensIn: number
        tokensOut: number
        costCents: number
        model: string
    } | null>(null)

    const model = chosenModel || models?.[0] || ""

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!selected) return
        if (!model) {
            toast.error("Pick a model first")
            return
        }
        if (!userPrompt.trim()) {
            toast.error("Enter a prompt")
            return
        }
        setStreaming("")
        setLastResult(null)
        try {
            const result = await send.mutateAsync({
                apiKey: selected,
                model,
                messages: [
                    ...(systemPrompt.trim()
                        ? ([
                              { role: "system", content: systemPrompt.trim() },
                          ] as const)
                        : []),
                    { role: "user", content: userPrompt.trim() },
                ],
                onDelta: (chunk) => {
                    setStreaming((prev) => prev + chunk)
                },
            })
            setLastResult({
                tokensIn: result.usage.prompt_tokens,
                tokensOut: result.usage.completion_tokens,
                costCents: result.costCents,
                model: result.model,
            })
            toast.success("Recorded usage")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Request failed")
        }
    }

    const hasKeys = (keys?.length ?? 0) > 0

    return (
        <>
            <AppHeader
                title="Playground"
                subtitle={selected?.name ?? "No key selected"}
                showKeySwitcher={hasKeys}
            />

            <div className="space-y-4 px-4 pt-3">
                {keysLoading ? (
                    <Skeleton className="h-72 w-full rounded-xl" />
                ) : !hasKeys ? (
                    <NoApiKeyState />
                ) : (
                    <>
                        <Card className="py-0 shadow-none">
                            <CardContent className="space-y-3 px-5 py-5">
                                <form onSubmit={onSubmit} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pg-model">Model</Label>
                                        <PickerDrawer
                                            triggerId="pg-model"
                                            title="Pick a model"
                                            description="Models available on the selected key."
                                            value={model}
                                            disabled={modelsLoading}
                                            options={(models ?? []).map(
                                                (m) => ({
                                                    value: m,
                                                    label: m,
                                                })
                                            )}
                                            onChange={setChosenModel}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="pg-system">
                                            System (optional)
                                        </Label>
                                        <textarea
                                            id="pg-system"
                                            value={systemPrompt}
                                            onChange={(e) =>
                                                setSystemPrompt(e.target.value)
                                            }
                                            rows={2}
                                            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                            placeholder="You are a helpful assistant."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="pg-user">Prompt</Label>
                                        <textarea
                                            id="pg-user"
                                            value={userPrompt}
                                            onChange={(e) =>
                                                setUserPrompt(e.target.value)
                                            }
                                            rows={4}
                                            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={send.isPending}
                                        className="h-11 w-full gap-2 rounded-full"
                                    >
                                        <HugeiconsIcon
                                            icon={Sent02Icon}
                                            size={18}
                                        />
                                        {send.isPending
                                            ? "Sending..."
                                            : "Send & record"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {(streaming || send.isPending) && (
                            <Card className="py-0 shadow-none">
                                <CardContent className="space-y-2 px-5 py-5">
                                    <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        Response
                                    </div>
                                    <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
                                        {streaming || "…"}
                                    </pre>
                                </CardContent>
                            </Card>
                        )}

                        {lastResult && (
                            <Card className="py-0 shadow-none">
                                <CardContent className="space-y-2 px-5 py-5 text-sm">
                                    <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        Last call
                                    </div>
                                    <Row k="Model" v={lastResult.model} />
                                    <Row
                                        k="Prompt tokens"
                                        v={formatNumber(lastResult.tokensIn)}
                                    />
                                    <Row
                                        k="Completion tokens"
                                        v={formatNumber(lastResult.tokensOut)}
                                    />
                                    <Row
                                        k="Cost"
                                        v={formatCurrency(lastResult.costCents)}
                                    />
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </>
    )
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
        </div>
    )
}
