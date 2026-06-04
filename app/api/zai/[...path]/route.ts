import type { NextRequest } from "next/server"

const UPSTREAM = {
    paas: "https://api.z.ai/api/paas/v4",
    coding: "https://api.z.ai/api/coding/paas/v4",
    monitor: "https://api.z.ai/api",
} as const

type Endpoint = keyof typeof UPSTREAM

function resolveEndpoint(req: NextRequest): Endpoint {
    const header = req.headers.get("x-zai-endpoint")
    if (header === "coding") return "coding"
    if (header === "monitor") return "monitor"
    return "paas"
}

async function proxy(req: NextRequest, path: string[]) {
    const auth = req.headers.get("authorization")
    if (!auth) {
        return Response.json(
            { error: "missing authorization header" },
            { status: 401 }
        )
    }

    const endpoint = resolveEndpoint(req)
    const base = UPSTREAM[endpoint]
    const search = req.nextUrl.search
    const url = `${base}/${path.join("/")}${search}`

    const headers = new Headers()
    headers.set("authorization", auth)
    const contentType = req.headers.get("content-type")
    if (contentType) headers.set("content-type", contentType)
    const accept = req.headers.get("accept")
    if (accept) headers.set("accept", accept)

    const init: RequestInit = {
        method: req.method,
        headers,
        cache: "no-store",
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = req.body
        // @ts-expect-error -- duplex required when streaming a request body
        init.duplex = "half"
    }

    const upstream = await fetch(url, init)

    const respHeaders = new Headers()
    const passThrough = ["content-type", "cache-control"]
    for (const h of passThrough) {
        const v = upstream.headers.get(h)
        if (v) respHeaders.set(h, v)
    }

    return new Response(upstream.body, {
        status: upstream.status,
        headers: respHeaders,
    })
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: Ctx) {
    const { path } = await ctx.params
    return proxy(req, path)
}

export async function POST(req: NextRequest, ctx: Ctx) {
    const { path } = await ctx.params
    return proxy(req, path)
}

export async function PUT(req: NextRequest, ctx: Ctx) {
    const { path } = await ctx.params
    return proxy(req, path)
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
    const { path } = await ctx.params
    return proxy(req, path)
}
