// Per-1M-token prices in USD cents, hand-curated from z.ai pricing pages.
// Costs computed here are approximations. Keep in sync with
// https://docs.z.ai/guides/llm/glm-4.6 and sibling pages.

type Price = { inputPerMCents: number; outputPerMCents: number }

const PRICING: Record<string, Price> = {
    "glm-4.6": { inputPerMCents: 60, outputPerMCents: 220 },
    "glm-4.5": { inputPerMCents: 60, outputPerMCents: 220 },
    "glm-4.5-air": { inputPerMCents: 20, outputPerMCents: 110 },
    "glm-4.5-x": { inputPerMCents: 220, outputPerMCents: 890 },
    "glm-4.5-airx": { inputPerMCents: 110, outputPerMCents: 440 },
    "glm-4.5-flash": { inputPerMCents: 0, outputPerMCents: 0 },
    "glm-4-32b-0414-128k": { inputPerMCents: 10, outputPerMCents: 10 },
    "glm-4-air-250414": { inputPerMCents: 50, outputPerMCents: 50 },
    "glm-4-airx": { inputPerMCents: 1000, outputPerMCents: 1000 },
    "glm-4-flash-250414": { inputPerMCents: 0, outputPerMCents: 0 },
    "glm-4-flashx-250414": { inputPerMCents: 10, outputPerMCents: 10 },
    "glm-4-plus": { inputPerMCents: 5000, outputPerMCents: 5000 },
    "glm-4-long": { inputPerMCents: 100, outputPerMCents: 100 },
    "glm-4.5v": { inputPerMCents: 60, outputPerMCents: 180 },
    "glm-4v-plus-0111": { inputPerMCents: 400, outputPerMCents: 400 },
    "glm-z1-air": { inputPerMCents: 50, outputPerMCents: 50 },
    "glm-z1-airx": { inputPerMCents: 500, outputPerMCents: 500 },
    "glm-z1-flash": { inputPerMCents: 0, outputPerMCents: 0 },
}

const DEFAULT_PRICE: Price = { inputPerMCents: 60, outputPerMCents: 220 }

export function priceFor(model: string): Price {
    const direct = PRICING[model]
    if (direct) return direct
    const lower = model.toLowerCase()
    if (PRICING[lower]) return PRICING[lower]
    // Try matching by prefix for variants like "glm-4.5-air-foo"
    for (const key of Object.keys(PRICING)) {
        if (lower.startsWith(key)) return PRICING[key]
    }
    return DEFAULT_PRICE
}

export function costCents(
    model: string,
    tokensInput: number,
    tokensOutput: number
): number {
    const p = priceFor(model)
    const cents =
        (tokensInput * p.inputPerMCents) / 1_000_000 +
        (tokensOutput * p.outputPerMCents) / 1_000_000
    return Math.round(cents * 100) / 100
}

export const KNOWN_MODELS = Object.keys(PRICING)
