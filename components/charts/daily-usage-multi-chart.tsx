"use client"

import { format, parseISO } from "date-fns"
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { formatTokens } from "@/lib/format"
import { keyColor } from "@/lib/key-palette"

export type KeySeries = {
    keyId: string
    name: string
    dates: string[]
    values: number[]
}

type Props = {
    series: KeySeries[]
    metric: "tokens" | "requests"
}

export function DailyUsageMultiChart({ series, metric }: Props) {
    const label = metric === "tokens" ? "Tokens" : "Requests"
    const fmt =
        metric === "tokens"
            ? (v: number) => formatTokens(v)
            : (v: number) =>
                  new Intl.NumberFormat("en-US").format(Math.round(v))

    const dates = series[0]?.dates ?? []
    const rows = dates.map((date, i) => {
        const row: Record<string, string | number> = { date }
        for (const s of series) {
            row[s.keyId] = s.values[i] ?? 0
        }
        return row
    })

    return (
        <div className="-mx-2">
            <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={rows}
                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="var(--border)"
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(v: string) =>
                                format(parseISO(v), "MMM d")
                            }
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            minTickGap={20}
                            stroke="var(--muted-foreground)"
                        />
                        <YAxis
                            tickFormatter={(v: number) => fmt(v)}
                            tickLine={false}
                            axisLine={false}
                            width={56}
                            fontSize={11}
                            stroke="var(--muted-foreground)"
                        />
                        <Tooltip
                            contentStyle={{
                                background: "var(--popover)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-md)",
                                color: "var(--popover-foreground)",
                                fontSize: 12,
                            }}
                            labelFormatter={(l) =>
                                format(parseISO(l as string), "MMM d, yyyy")
                            }
                            formatter={(value, name) => {
                                const s = series.find(
                                    (x) => x.keyId === name || x.name === name
                                )
                                return [
                                    fmt(Number(value)),
                                    s?.name ?? name ?? label,
                                ]
                            }}
                        />
                        {series.map((s, i) => (
                            <Line
                                key={s.keyId}
                                type="monotone"
                                dataKey={s.keyId}
                                name={s.name}
                                stroke={keyColor(i)}
                                strokeWidth={2}
                                dot={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {series.map((s, i) => (
                    <div
                        key={s.keyId}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: keyColor(i) }}
                        />
                        <span className="truncate">{s.name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
