// Standalone Cloudflare Cron Worker — keeps Z.ai Coding Plan keys "warm".
//
// Fully decoupled from the Next app: it calls Z.ai directly (no /api/zai proxy,
// which only exists to bypass *browser* CORS). Keys are supplied as the
// WARMUP_KEYS secret, comma-separated. Request shape mirrors warmUpKey() in
// ../lib/zai-client.ts.

const CODING_BASE = "https://api.z.ai/api/coding/paas/v4"
const WARM_UP_MODEL = "glm-4.5-air"

async function warmUp(key) {
    const res = await fetch(`${CODING_BASE}/chat/completions`, {
        method: "POST",
        headers: {
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: WARM_UP_MODEL,
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 1,
            stream: false,
        }),
    })
    return { ok: res.ok, status: res.status }
}

function parseKeys(env) {
    return (env.WARMUP_KEYS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
}

export default {
    async scheduled(event, env, ctx) {
        const keys = parseKeys(env)
        const results = await Promise.allSettled(keys.map(warmUp))
        const okCount = results.filter(
            (r) => r.status === "fulfilled" && r.value.ok
        ).length
        // Summary only — keys are never logged.
        console.log(`warm-up: ${okCount}/${keys.length} ok @ ${event.cron}`)
    },

    // Convenience: trigger a run manually via browser/curl to verify.
    async fetch(request, env, ctx) {
        const keys = parseKeys(env)
        const results = await Promise.allSettled(keys.map(warmUp))
        return Response.json(
            results.map((r) =>
                r.status === "fulfilled"
                    ? r.value
                    : { ok: false, error: String(r.reason) }
            )
        )
    },
}
