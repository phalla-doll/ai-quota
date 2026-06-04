import { BottomNav } from "@/components/layout/bottom-nav"

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="bg-background relative mx-auto min-h-svh max-w-md">
            <main className="pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
                {children}
            </main>
            <BottomNav />
        </div>
    )
}
