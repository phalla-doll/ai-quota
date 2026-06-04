"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Sent02Icon,
    ChevronDownIcon,
    Delete02Icon,
} from "@hugeicons/core-free-icons"
import { AppHeader } from "@/components/layout/app-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PickerDrawer } from "@/components/ui/picker-drawer"
import { NoApiKeyState } from "@/components/dashboard/empty-state"
import { useApiKeys, useSelectedApiKey } from "@/hooks/use-api-keys"
import { useChatCompletion } from "@/hooks/use-chat-completion"
import { useQuery } from "@tanstack/react-query"
import { listModels, type ChatMessage } from "@/lib/zai-client"
import { KNOWN_MODELS } from "@/lib/zai-pricing"
import { formatCurrency, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

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

type ChatTurn =
    | { role: "user"; content: string }
    | {
          role: "assistant"
          content: string
          usage?: {
              tokensIn: number
              tokensOut: number
              costCents: number
              model: string
          }
      }

export default function PlaygroundPage() {
    const { data: keys, isLoading: keysLoading } = useApiKeys()
    const selected = useSelectedApiKey()
    const { data: models, isLoading: modelsLoading } = useAvailableModels()
    const send = useChatCompletion()

    const [chosenModel, setChosenModel] = React.useState<string>("")
    const [draft, setDraft] = React.useState("")
    const [turns, setTurns] = React.useState<ChatTurn[]>([])
    const [streaming, setStreaming] = React.useState("")
    const [pickerOpen, setPickerOpen] = React.useState(false)
    const bottomRef = React.useRef<HTMLDivElement | null>(null)
    const taRef = React.useRef<HTMLTextAreaElement | null>(null)

    const model = chosenModel || models?.[0] || ""
    const hasKeys = (keys?.length ?? 0) > 0

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, [turns, streaming])

    function autosize(el: HTMLTextAreaElement | null) {
        if (!el) return
        el.style.height = "auto"
        const next = Math.min(el.scrollHeight, 160)
        el.style.height = next + "px"
        el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden"
    }

    React.useEffect(() => {
        autosize(taRef.current)
    }, [draft])

    async function onSubmit(e?: React.FormEvent) {
        e?.preventDefault()
        if (!selected || send.isPending) return
        const text = draft.trim()
        if (!text) return
        if (!model) {
            toast.error("Pick a model first")
            return
        }
        const nextTurns: ChatTurn[] = [
            ...turns,
            { role: "user", content: text },
        ]
        setTurns(nextTurns)
        setDraft("")
        setStreaming("")
        try {
            const apiMessages: ChatMessage[] = nextTurns.map((t) => ({
                role: t.role,
                content: t.content,
            }))
            const result = await send.mutateAsync({
                apiKey: selected,
                model,
                messages: apiMessages,
                onDelta: (chunk) => setStreaming((prev) => prev + chunk),
            })
            setTurns((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: result.content ?? "",
                    usage: {
                        tokensIn: result.usage.prompt_tokens,
                        tokensOut: result.usage.completion_tokens,
                        costCents: result.costCents,
                        model: result.model,
                    },
                },
            ])
            setStreaming("")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Request failed")
            setStreaming("")
        }
    }

    function clearChat() {
        if (send.isPending) return
        setTurns([])
        setStreaming("")
    }

    return (
        <>
            <AppHeader
                title="Playground"
                subtitle="Chat with a key"
                showKeySwitcher={hasKeys}
            />

            {keysLoading ? (
                <>
                    <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-background/90 px-4 py-2 backdrop-blur">
                        <Skeleton className="h-8 w-32 rounded-full" />
                        <Skeleton className="h-7 w-16 rounded-full" />
                    </div>
                    <div className="flex flex-col gap-3 px-4 pt-4 pb-24">
                        <div className="mt-16 flex flex-col items-center gap-2 text-center">
                            <Skeleton className="h-5 w-24 rounded-md" />
                            <Skeleton className="h-3.5 w-56 rounded-md" />
                        </div>
                    </div>
                </>
            ) : !hasKeys ? (
                <div className="px-4">
                    <NoApiKeyState />
                </div>
            ) : (
                <>
                    <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-background/90 px-4 py-2 backdrop-blur">
                        <button
                            type="button"
                            disabled={modelsLoading}
                            onClick={() => setPickerOpen(true)}
                            className="flex min-w-0 items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm font-medium disabled:opacity-60"
                        >
                            <span className="truncate uppercase">
                                {model || "Pick a model"}
                            </span>
                            <HugeiconsIcon icon={ChevronDownIcon} size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={clearChat}
                            disabled={turns.length === 0 || send.isPending}
                            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                            aria-label="Clear chat"
                        >
                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                            Clear
                        </button>
                        <PickerDrawer
                            value={model}
                            options={(models ?? []).map((m) => ({
                                value: m,
                                label: m.toUpperCase(),
                            }))}
                            onChange={setChosenModel}
                            title="Pick a model"
                            description="Models available on the selected key."
                            open={pickerOpen}
                            onOpenChange={setPickerOpen}
                            hideTrigger
                        />
                    </div>

                    <div className="flex flex-col gap-3 px-4 pt-4 pb-24">
                        {turns.length === 0 && !send.isPending ? (
                            <div className="mt-16 flex flex-col items-center text-center text-sm text-muted-foreground">
                                <div className="mb-1 text-base font-medium text-foreground">
                                    Start a chat
                                </div>
                                <div>
                                    Send a message to test the selected key.
                                </div>
                            </div>
                        ) : null}

                        {turns.map((t, i) => (
                            <Bubble key={i} turn={t} />
                        ))}

                        {send.isPending ? (
                            <Bubble
                                turn={{
                                    role: "assistant",
                                    content: streaming,
                                }}
                                pending={!streaming}
                            />
                        ) : null}

                        <div ref={bottomRef} />
                    </div>

                    <ComposerPortal>
                        <form
                            onSubmit={onSubmit}
                            className="flex items-end gap-2"
                        >
                            <textarea
                                ref={taRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (
                                        e.key === "Enter" &&
                                        !e.shiftKey &&
                                        !e.nativeEvent.isComposing
                                    ) {
                                        e.preventDefault()
                                        onSubmit()
                                    }
                                }}
                                rows={1}
                                placeholder="Message…"
                                className="max-h-40 flex-1 resize-none overflow-hidden rounded-2xl border border-input bg-background px-4 py-2.5 text-sm leading-snug focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={send.isPending || !draft.trim()}
                                className="h-10 w-10 shrink-0 rounded-full"
                                aria-label="Send"
                            >
                                <HugeiconsIcon icon={Sent02Icon} size={18} />
                            </Button>
                        </form>
                    </ComposerPortal>
                </>
            )}
        </>
    )
}

function ComposerPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])
    if (!mounted) return null
    return createPortal(
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 mx-auto max-w-md border-t bg-background/95 px-3 pt-2 pb-2 backdrop-blur">
            {children}
        </div>,
        document.body
    )
}

function Bubble({ turn, pending }: { turn: ChatTurn; pending?: boolean }) {
    const isUser = turn.role === "user"
    return (
        <div
            className={cn(
                "flex w-full",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            <div
                className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    isUser
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-muted text-foreground"
                )}
            >
                {pending && !turn.content ? (
                    <TypingDots />
                ) : (
                    turn.content || (isUser ? "" : "…")
                )}
                {!isUser && turn.role === "assistant" && turn.usage ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
                        <span className="truncate uppercase">
                            {turn.usage.model}
                        </span>
                        <span>·</span>
                        <span>
                            {formatNumber(turn.usage.tokensIn)} in /{" "}
                            {formatNumber(turn.usage.tokensOut)} out
                        </span>
                        <span>·</span>
                        <span>{formatCurrency(turn.usage.costCents)}</span>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-50 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-50 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-50 [animation-delay:300ms]" />
        </span>
    )
}
