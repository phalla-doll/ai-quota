import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Key01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function NoApiKeyState() {
    return (
        <Card className="shadow-none py-0">
            <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
                    <HugeiconsIcon icon={Key01Icon} size={24} />
                </div>
                <div>
                    <div className="font-semibold">No API keys yet</div>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Add your Z.ai key in Settings, then send a request
                        from the Playground to start tracking usage.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/settings">Add API key</Link>
                </Button>
            </CardContent>
        </Card>
    )
}
