import type { ZaiEndpoint } from "./types"

const PROXY_BASE = "/api/zai"

type ClientOpts = { key: string; endpoint: ZaiEndpoint }

function authHeaders({ key, endpoint }: ClientOpts): HeadersInit {
    return {
        authorization: `Bearer ${key}`,
        "x-zai-endpoint": endpoint,
    }
}

export type ZaiModel = { id: string }

export async function listModels(opts: ClientOpts): Promise<ZaiModel[]> {
    const res = await fetch(`${PROXY_BASE}/models`, {
        headers: authHeaders(opts),
    })
    if (!res.ok) throw new Error(`models failed: ${res.status}`)
    const data = (await res.json()) as { data?: ZaiModel[] }
    return data.data ?? []
}

export async function validateKey(
    opts: ClientOpts
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const res = await fetch(`${PROXY_BASE}/models`, {
            headers: authHeaders(opts),
        })
        if (res.ok) return { ok: true }
        const text = await res.text()
        return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "network error" }
    }
}

export type ChatMessage = {
    role: "system" | "user" | "assistant"
    content: string
}

export type ChatUsage = {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
}

export type ChatResult = {
    content: string
    model: string
    usage: ChatUsage
}

export type ChatCompletionInput = ClientOpts & {
    model: string
    messages: ChatMessage[]
    onDelta?: (chunk: string) => void
}

export async function chatCompletion({
    key,
    endpoint,
    model,
    messages,
    onDelta,
}: ChatCompletionInput): Promise<ChatResult> {
    const res = await fetch(`${PROXY_BASE}/chat/completions`, {
        method: "POST",
        headers: {
            ...authHeaders({ key, endpoint }),
            "content-type": "application/json",
            accept: "text/event-stream",
        },
        body: JSON.stringify({
            model,
            messages,
            stream: true,
            stream_options: { include_usage: true },
        }),
    })

    if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "")
        throw new Error(`chat failed: ${res.status} ${text.slice(0, 200)}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let content = ""
    let usage: ChatUsage | null = null
    let resolvedModel = model

    while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const raw of lines) {
            const line = raw.trim()
            if (!line.startsWith("data:")) continue
            const payload = line.slice(5).trim()
            if (!payload || payload === "[DONE]") continue
            try {
                const json = JSON.parse(payload) as {
                    model?: string
                    usage?: ChatUsage
                    choices?: { delta?: { content?: string } }[]
                }
                if (json.model) resolvedModel = json.model
                const delta = json.choices?.[0]?.delta?.content
                if (delta) {
                    content += delta
                    onDelta?.(delta)
                }
                if (json.usage) usage = json.usage
            } catch {
                // ignore malformed chunks
            }
        }
    }

    if (!usage) {
        throw new Error("response stream ended without usage data")
    }

    return { content, model: resolvedModel, usage }
}
