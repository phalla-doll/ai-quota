export function SettingsSection({
    title,
    description,
    children,
}: {
    title: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <section className="space-y-2">
            <div className="px-1">
                <h2 className="text-sm font-semibold">{title}</h2>
                {description ? (
                    <p className="text-muted-foreground text-xs">
                        {description}
                    </p>
                ) : null}
            </div>
            {children}
        </section>
    )
}
