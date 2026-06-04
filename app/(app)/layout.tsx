import { AppShell } from "@/components/layout/app-shell"

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mx-auto min-h-svh max-w-md bg-background">
            <AppShell>{children}</AppShell>
        </div>
    )
}
