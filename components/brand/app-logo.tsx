import * as React from "react"
import { cn } from "@/lib/utils"

type AppLogoProps = React.SVGProps<SVGSVGElement> & {
    size?: number
}

export function AppLogo({ size = 72, className, ...props }: AppLogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(className)}
            aria-hidden="true"
            {...props}
        >
            <rect width="64" height="64" rx="14" fill="#1f1f23" />
            <circle
                cx="32"
                cy="32"
                r="17"
                stroke="#ffffff"
                strokeOpacity="0.16"
                strokeWidth="5"
            />
            <path
                d="M 49 32 A 17 17 0 1 1 32 15"
                stroke="#ffffff"
                strokeWidth="5"
                strokeLinecap="round"
            />
            <circle cx="32" cy="15" r="3.6" fill="#34d399" />
        </svg>
    )
}
