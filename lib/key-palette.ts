export const keyPalette = [
    "oklch(0.75 0.17 160)", // green
    "oklch(0.68 0.20 295)", // purple
    "oklch(0.72 0.16 230)", // blue
    "oklch(0.76 0.17 60)", // orange
    "oklch(0.72 0.20 350)", // pink
    "oklch(0.78 0.16 95)", // yellow
    "oklch(0.70 0.16 195)", // teal
] as const

export function keyColor(index: number) {
    return keyPalette[index % keyPalette.length]
}
