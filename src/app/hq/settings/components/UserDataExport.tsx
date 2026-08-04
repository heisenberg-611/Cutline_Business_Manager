'use client';

import { useEffect, useState, useTransition } from 'react';
import { Search, FileText, FileJson, Check, Loader2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchUsersForExport, type ExportUserResult } from '../user-export-actions';

const displayName = (user: ExportUserResult) =>
  [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

export function UserDataExport() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExportUserResult[]>([]);
  const [selected, setSelected] = useState<ExportUserResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();

  useEffect(() => {
    const q = query.trim();

    // Don't re-search the name we just dropped into the box on selection.
    if (selected && q === displayName(selected)) return;

    if (q.length < 2) return;

    const debounce = setTimeout(() => {
      startSearch(async () => {
        try {
          setResults(await searchUsersForExport(q));
          setError(null);
        } catch {
          setError('Could not search users. Your admin session may have expired.');
        }
      });
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, selected]);

  const exportUrl = (format: 'html' | 'json') =>
    `/hq/api/export/user?userId=${encodeURIComponent(selected?.id ?? '')}&format=${format}`;

  // Hide stale hits rather than clearing them from inside the effect.
  const suggestions = query.trim().length >= 2 ? results : [];

  return (
    <div className="p-6 border border-border/50 rounded-xl bg-muted/10">
      <h4 className="text-base font-semibold mb-2">Export one person&apos;s data</h4>
      <p className="text-sm text-muted-foreground mb-4">
        For users who ask for a copy of their data. Produces a plain-English report covering their
        profile, organisations, projects, tasks, notes, logged time, messages sent and received,
        notifications and support requests — written so a non-technical person can read it. Every
        export is recorded in the admin audit log.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Search by name, email or user ID..."
          className="pl-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {!selected && suggestions.length > 0 && (
        <div className="mt-3 border border-border/50 rounded-lg divide-y divide-border/50 overflow-hidden bg-background">
          {suggestions.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setSelected(user);
                setQuery(displayName(user));
                setResults([]);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              {user.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-muted" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{displayName(user)}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!selected && !isSearching && query.trim().length >= 2 && suggestions.length === 0 && !error && (
        <p className="mt-3 text-sm text-muted-foreground">No users match that search.</p>
      )}

      {selected && (
        <div className="mt-4 p-4 rounded-lg border border-border/50 bg-background">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm">{displayName(selected)}</div>
              <div className="text-xs text-muted-foreground">{selected.email}</div>
              <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{selected.id}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {selected.organisations.length > 0
                  ? selected.organisations.join(', ')
                  : 'No organisations'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <a href={exportUrl('html')} download>
              <Button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <FileText className="w-4 h-4 mr-2" />
                Download readable report
              </Button>
            </a>
            <a href={exportUrl('json')} download>
              <Button type="button" variant="outline">
                <FileJson className="w-4 h-4 mr-2" />
                Download JSON
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            The report opens in any browser and prints to PDF. The JSON file is the same data in a
            portable format, for users who want to move it elsewhere.
          </p>
        </div>
      )}
    </div>
  );
}
