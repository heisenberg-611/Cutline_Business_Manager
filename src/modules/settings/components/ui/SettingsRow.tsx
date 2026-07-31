export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="sm:max-w-sm">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        {description && (
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="w-full sm:w-auto sm:min-w-[240px] sm:flex sm:justify-end">{children}</div>
    </div>
  )
}
