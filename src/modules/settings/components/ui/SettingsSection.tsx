export function SettingsSection({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h4>
          {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
        </div>
        {action}
      </div>
      <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 divide-y divide-zinc-200 dark:divide-white/10 overflow-hidden">
        {children}
      </div>
    </section>
  )
}
