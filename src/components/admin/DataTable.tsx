import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  rows, columns, pageSize = 10, onRowClick,
}: { rows: T[]; columns: Column<T>[]; pageSize?: number; onRowClick?: (row: T) => void }) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [rows.length]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const view = rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              {columns.map(c => (
                <th key={c.key} className={`text-left font-semibold text-[11px] uppercase tracking-wider text-muted-foreground px-4 py-3 ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((row, i) => (
              <tr
                key={row.id}
                className="border-b border-border/60 hover:bg-surface-light/50 transition cursor-pointer animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(c => (
                  <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
            {view.length === 0 && (
              <tr><td colSpan={columns.length} className="text-center py-12 text-muted-foreground">No data found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface/50">
          <div className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-surface-light"
            ><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs px-3">Page {page} of {pages}</span>
            <button
              disabled={page === pages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-surface-light"
            ><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-input border border-border focus-within:border-primary focus-within:glow-cyan transition flex-1 min-w-0">
      <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent outline-none text-sm flex-1 min-w-0 placeholder:text-dim"
      />
      {value && (
        <button onClick={() => onChange("")} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label?: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none h-10 pl-3 pr-9 rounded-xl bg-input border border-border text-sm font-medium hover:border-primary/50 focus:border-primary focus:outline-none cursor-pointer min-w-[140px]"
      >
        {label && <option value="">{label}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronRight className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-muted-foreground" />
    </div>
  );
}

export function useFilters<T>(rows: T[], filters: Array<(row: T) => boolean>) {
  return useMemo(() => rows.filter(r => filters.every(f => f(r))), [rows, filters]);
}
