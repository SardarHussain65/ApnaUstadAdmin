import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Database, Search, X } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTablePagination {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ page, totalPages, totalItems, pageSize, visibleItems, onPageChange }: DataTablePagination & { pageSize: number; visibleItems: number }) {
  if (totalItems <= pageSize) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-surface/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-medium text-muted-foreground">
        Showing {(page - 1) * pageSize + 1}–{Math.min((page - 1) * pageSize + visibleItems, totalItems)} of {totalItems}
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="icon-button h-8 w-8 border-border disabled:pointer-events-none disabled:opacity-30"
        ><ChevronLeft className="w-4 h-4" /></button>
        <span className="px-3 text-xs font-bold text-foreground">Page {page} of {totalPages}</span>
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="icon-button h-8 w-8 border-border disabled:pointer-events-none disabled:opacity-30"
        ><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export function DataTable<T extends Record<string, any>>({
  rows, columns, pageSize = 10, onRowClick, isLoading = false, pagination,
}: { rows: T[]; columns: Column<T>[]; pageSize?: number; onRowClick?: (row: T) => void; isLoading?: boolean; pagination?: DataTablePagination }) {
  const [localPage, setLocalPage] = useState(1);
  useEffect(() => { setLocalPage(1); }, [rows.length]);
  const page = pagination?.page ?? localPage;
  const pages = pagination?.totalPages ?? Math.max(1, Math.ceil(rows.length / pageSize));
  const totalItems = pagination?.totalItems ?? rows.length;
  const view = pagination ? rows : rows.slice((page - 1) * pageSize, page * pageSize);
  const changePage = pagination?.onPageChange ?? setLocalPage;

  return (
    <div className="app-glass overflow-hidden rounded-[18px]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/70">
              {columns.map(c => (
                <th key={c.key} className={`whitespace-nowrap px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 5 }).map((_, rIndex) => (
                <tr key={rIndex} className="border-b border-border/60">
                  {columns.map((c, cIndex) => (
                    <td key={c.key} className="px-4 py-4">
                      <div 
                        className="h-4 rounded-lg bg-white/[0.055] animate-pulse"
                        style={{ 
                          width: cIndex === 0 ? "50%" : cIndex === columns.length - 1 ? "40%" : "80%",
                          animationDelay: `${rIndex * 75}ms`
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!isLoading && view.map((row, i) => (
              <tr
                key={row.id ?? row._id ?? i}
                className={`border-b border-border/60 transition-colors animate-fade-in hover:bg-primary/[0.035] ${onRowClick ? "cursor-pointer" : ""}`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => onRowClick?.(row)}
                onKeyDown={event => {
                  if (onRowClick && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map(c => (
                  <td key={c.key} className={`px-4 py-4 text-foreground/90 ${c.className ?? ""}`}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
            {!isLoading && view.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                      <Database className="h-6 w-6" />
                    </div>
                    <div className="font-bold text-white">No records found</div>
                    <div className="mt-1.5 text-sm leading-relaxed text-dim">Try adjusting the filters or search query.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={pages} totalItems={totalItems} pageSize={pageSize} visibleItems={view.length} onPageChange={changePage} />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border/80 bg-input/90 px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-primary/25 focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/10">
      <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0! bg-transparent! text-sm outline-none! ring-0! shadow-none! placeholder:text-dim"
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search" className="rounded-lg p-1 text-dim transition hover:bg-white/5 hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function FilterToolbar({ children }: { children: ReactNode }) {
  return <div className="filter-toolbar">{children}</div>;
}

export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label?: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 min-w-[140px] cursor-pointer appearance-none rounded-xl border border-border bg-input pl-3 pr-9 text-xs font-semibold text-foreground outline-none transition hover:border-primary/30 focus:border-primary/70"
      >
        {label && <option value="">{label}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronRight className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-muted-foreground" />
    </div>
  );
}

export function useFilters<T>(rows: T[], filters: Array<(row: T) => boolean>) {
  return useMemo(() => rows.filter(r => filters.every(f => f(r))), [rows, filters]);
}
