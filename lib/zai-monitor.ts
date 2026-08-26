const PROXY_BASE = "/api/zai"
const MONITOR_DIRECT_BASE = "https://api.z.ai/api"

export type QuotaLimit = {
    type: "TOKENS_LIMIT" | "TIME_LIMIT" | string
    unit: number
    number: number
    usage?: number
    currentValue?: number
    remaining?: number
    percentage: number
    nextResetTime: number
    usageDetails?: { modelCode: string; usage: number }[]
}

export type QuotaResponse = {
    limits: QuotaLimit[]
    level: string
}

export type ModelSummary = {
    modelName: string
    totalTokens: number
    sortOrder: number
}

export type ModelSeries = {
    modelName: string
    sortOrder: number
    tokensUsage: number[]
    totalTokens: number
}

export type ModelUsageResponse = {
    x_time: string[]
    modelCallCount: number[]
    tokensUsage: number[]
    totalUsage: {
        totalModelCallCount: number
        totalTokensUsage: number
        modelSummaryList: ModelSummary[]
    }
    modelDataList: ModelSeries[]
    modelSummaryList: ModelSummary[]
    granularity: string
}

type Envelope<T> = {
    code: number
    msg: string
    success: boolean
    data: T
}

class TransportError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "TransportError"
    }
}

async function readEnvelope<T>(res: Response, path: string): Promise<T> {
    if (!res.ok) {
        throw new TransportError(`${path} failed: HTTP ${res.status}`)
    }
    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("json")) {
        throw new TransportError(
            `${path} returned non-JSON (${contentType || "untyped"})`
        )
    }
    let body: Envelope<T>
    try {
        body = (await res.json()) as Envelope<T>
    } catch {
        throw new TransportError(`${path} returned malformed JSON`)
    }
    if (!body.success) {
        throw new Error(body.msg || `${path} error code ${body.code}`)
    }
    return body.data
}

async function monitorGet<T>(path: string, key: string): Promise<T> {
    const res = await fetch(`${PROXY_BASE}/${path}`, {
        headers: {
            authorization: `Bearer ${key}`,
            "x-zai-endpoint": "monitor",
        },
        cache: "no-store",
    })
    return readEnvelope<T>(res, path)
}

async function monitorGetDirect<T>(path: string, key: string): Promise<T> {
    let res: Response
    try {
        res = await fetch(`${MONITOR_DIRECT_BASE}/${path}`, {
            headers: { authorization: `Bearer ${key}` },
            cache: "no-store",
        })
    } catch (err) {
        throw new TransportError(
            `${path} direct fetch failed: ${(err as Error | null)?.message ?? err}`
        )
    }
    return readEnvelope<T>(res, path)
}

export function fetchQuotaLimit(key: string): Promise<QuotaResponse> {
    return monitorGet<QuotaResponse>("monitor/usage/quota/limit", key)
}

function formatDateTime(d: Date): string {
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
        d.getHours()
    )}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function fetchModelUsage(
    key: string,
    start: Date,
    end: Date
): Promise<ModelUsageResponse> {
    const q = `?startTime=${encodeURIComponent(
        formatDateTime(start)
    )}&endTime=${encodeURIComponent(formatDateTime(end))}`
    const path = `monitor/usage/model-usage${q}`
    return monitorGetDirect<ModelUsageResponse>(path, key).catch((err) => {
        if (!(err instanceof TransportError)) throw err
        return monitorGet<ModelUsageResponse>(path, key)
    })
}
