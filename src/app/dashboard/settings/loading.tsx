export default function SettingsLoading() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-4 w-64 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-3 w-48 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
            </div>
            <div className="h-10 w-48 bg-zinc-100 dark:bg-zinc-900 rounded-md"></div>
          </div>
          <div className="h-px bg-zinc-200 dark:bg-white/10 w-full" />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-3 w-56 bg-zinc-100 dark:bg-zinc-900 rounded"></div>
            </div>
            <div className="h-10 w-24 bg-zinc-100 dark:bg-zinc-900 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
