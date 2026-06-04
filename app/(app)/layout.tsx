import { BottomNav } from "@/components/layout/bottom-nav"
import { PageTransition } from "@/components/layout/page-transition"

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative mx-auto min-h-svh max-w-md bg-background">
            <main className="pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
                <PageTransition>{children}</PageTransition>
            </main>
            <BottomNav />
        </div>
    )
}
