const PROXY_BASE = "/api/zai"

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

async function monitorGet<T>(path: string, key: string): Promise<T> {
    const res = await fetch(`${PROXY_BASE}/${path}`, {
        headers: {
            authorization: `Bearer ${key}`,
            "x-zai-endpoint": "monitor",
        },
        cache: "no-store",
    })
    if (!res.ok) {
        throw new Error(`${path} failed: HTTP ${res.status}`)
    }
    const body = (await res.json()) as Envelope<T>
    if (!body.success) {
        throw new Error(body.msg || `${path} error code ${body.code}`)
    }
    return body.data
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
    return monitorGet<ModelUsageResponse>(`monitor/usage/model-usage${q}`, key)
}
