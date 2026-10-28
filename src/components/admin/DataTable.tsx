import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Check,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: string;
  defaultHidden?: boolean;
}

export interface DataTablePagination {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  visibleItems,
  onPageChange,
}: DataTablePagination & { pageSize: number; visibleItems: number }) {
  if (totalItems <= pageSize) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-surface/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-medium text-muted-foreground">
        Showing {(page - 1) * pageSize + 1}–{Math.min((page - 1) * pageSize + visibleItems, totalItems)} of {totalItems}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          className="icon-button h-8 w-8 border-border disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 text-xs font-bold text-foreground">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          className="icon-button h-8 w-8 border-border disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export interface DataTableEmptyProps {
  /** Active search text: shows `No results for "xyz"` + Clear filters. */
  query?: string;
  /** True when any filter is active: switches to the "no results" variant. */
  hasFilters?: boolean;
  onClearFilters?: () => void;
  /** Queue pages: "All caught up" success variant when nothing is filtered. */
  emptyVariant?: "empty" | "success";
  emptyTitle?: string;
  emptyDescription?: string;
}

export interface DataTableProps<T extends Record<string, any>> extends DataTableEmptyProps {
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  pagination?: DataTablePagination;
  // Sorting
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string, order: "asc" | "desc") => void;
  // Density
  density?: "compact" | "default";
  onDensityChange?: (density: "compact" | "default") => void;
  enableDensityToggle?: boolean;
  // Selection & Bulk actions
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  idKey?: string;
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => ReactNode;
  // Column visibility
  enableColumnVisibility?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  pageSize = 10,
  onRowClick,
  isLoading = false,
  pagination,
  query,
  hasFilters,
  onClearFilters,
  emptyVariant = "empty",
  emptyTitle,
  emptyDescription,
  sortField,
  sortOrder,
  onSortChange,
  density: propDensity,
  onDensityChange,
  enableDensityToggle = true,
  selectedIds,
  onSelectionChange,
  idKey = "_id",
  bulkActions,
  enableColumnVisibility = true,
}: DataTableProps<T>) {
  const [localPage, setLocalPage] = useState(1);
  const [localDensity, setLocalDensity] = useState<"compact" | "default">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("au-table-density");
      if (saved === "compact" || saved === "default") return saved;
    }
    return "default";
  });

  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    const s = new Set<string>();
    columns.forEach((c) => {
      if (c.defaultHidden) s.add(c.key);
    });
    return s;
  });

  const density = propDensity ?? localDensity;
  const toggleDensity = () => {
    const next = density === "default" ? "compact" : "default";
    setLocalDensity(next);
    if (typeof window !== "undefined") localStorage.setItem("au-table-density", next);
    onDensityChange?.(next);
  };

  useEffect(() => {
    setLocalPage(1);
  }, [rows.length]);

  const page = pagination?.page ?? localPage;
  const pages = pagination?.totalPages ?? Math.max(1, Math.ceil(rows.length / pageSize));
  const totalItems = pagination?.totalItems ?? rows.length;
  const view = pagination ? rows : rows.slice((page - 1) * pageSize, page * pageSize);
  const changePage = pagination?.onPageChange ?? setLocalPage;

  // Active columns after filtering hidden ones
  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.key)),
    [columns, hiddenCols]
  );

  // Row selection logic
  const selectionEnabled = !!onSelectionChange && !!selectedIds;
  const currentPageIds = useMemo(
    () => view.map((r) => String(r[idKey] ?? r.id ?? "")).filter(Boolean),
    [view, idKey]
  );
  const allCurrentSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds?.includes(id));
  const someCurrentSelected =
    !allCurrentSelected &&
    currentPageIds.some((id) => selectedIds?.includes(id));

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allCurrentSelected) {
      onSelectionChange(selectedIds?.filter((id) => !currentPageIds.includes(id)) || []);
    } else {
      const set = new Set([...(selectedIds || []), ...currentPageIds]);
      onSelectionChange(Array.from(set));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds?.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...(selectedIds || []), id]);
    }
  };

  const handleSort = (col: Column<T>) => {
    if (!col.sortable && !col.sortKey) return;
    const key = col.sortKey || col.key;
    if (!onSortChange) return;

    if (sortField === key) {
      if (sortOrder === "asc") onSortChange(key, "desc");
      else onSortChange(key, "asc");
    } else {
      onSortChange(key, "asc");
    }
  };

  return (
    <div className="space-y-2">
      {/* Table Toolbar Controls (Density & Column Visibility) */}
      {(enableDensityToggle || enableColumnVisibility) && (
        <div className="flex items-center justify-end gap-2 text-xs">
          {enableDensityToggle && (
            <button
              type="button"
              onClick={toggleDensity}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 font-medium text-muted-foreground transition hover:text-foreground",
                density === "compact" && "border-primary/40 text-primary"
              )}
              title={`Switch to ${density === "compact" ? "default" : "compact"} row density`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{density === "compact" ? "Compact" : "Default"}</span>
            </button>
          )}

          {enableColumnVisibility && columns.length > 2 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 font-medium text-muted-foreground transition hover:text-foreground"
                >
                  <span>Columns ({visibleColumns.length}/{columns.length})</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-border bg-card p-1.5 shadow-xl">
                <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
                  Toggle Columns
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                {columns.map((c) => {
                  const isVisible = !hiddenCols.has(c.key);
                  return (
                    <DropdownMenuCheckboxItem
                      key={c.key}
                      checked={isVisible}
                      onCheckedChange={(checked) => {
                        setHiddenCols((prev) => {
                          const next = new Set(prev);
                          if (checked) next.delete(c.key);
                          else if (visibleColumns.length > 1) next.add(c.key);
                          return next;
                        });
                      }}
                      className="cursor-pointer text-xs"
                    >
                      {c.header}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Main Table Glass Container */}
      <div className="app-glass overflow-hidden rounded-[18px] border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/70">
                {selectionEnabled && (
                  <th className="w-10 px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-muted-foreground hover:text-foreground"
                      title={allCurrentSelected ? "Deselect all" : "Select all"}
                    >
                      {allCurrentSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : someCurrentSelected ? (
                        <MinusSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.map((c) => {
                  const isSortable = !!c.sortable || !!c.sortKey;
                  const sortKey = c.sortKey || c.key;
                  const isActiveSort = sortField === sortKey;

                  return (
                    <th
                      key={c.key}
                      onClick={() => handleSort(c)}
                      className={cn(
                        "whitespace-nowrap px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground select-none",
                        isSortable && "cursor-pointer hover:text-foreground",
                        c.className ?? ""
                      )}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>{c.header}</span>
                        {isSortable && (
                          <span className="text-muted-foreground">
                            {isActiveSort ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-primary" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, rIndex) => (
                  <tr key={rIndex} className="border-b border-border/60">
                    {selectionEnabled && (
                      <td className="px-3 py-3 text-center">
                        <div className="skeleton h-4 w-4 rounded mx-auto" />
                      </td>
                    )}
                    {visibleColumns.map((c, cIndex) => (
                      <td
                        key={c.key}
                        className={cn(
                          "dt-cell",
                          density === "compact" ? "py-2 px-3 text-xs" : "py-3.5 px-4 text-sm"
                        )}
                      >
                        <div
                          className="skeleton h-4"
                          style={{
                            width: cIndex === 0 ? "55%" : cIndex === visibleColumns.length - 1 ? "40%" : "75%",
                            opacity: 1 - rIndex * 0.12,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading &&
                view.map((row, i) => {
                  const rowId = String(row[idKey] ?? row.id ?? i);
                  const isSelected = selectedIds?.includes(rowId);

                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        "border-b border-border/60 transition-colors animate-fade-in hover:bg-primary/[0.035]",
                        isSelected && "bg-primary/[0.06]",
                        onRowClick ? "cursor-pointer" : ""
                      )}
                      style={{ animationDelay: `${i * 25}ms` }}
                      onClick={() => onRowClick?.(row)}
                      onKeyDown={(event) => {
                        if (onRowClick && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }}
                      tabIndex={onRowClick ? 0 : undefined}
                    >
                      {selectionEnabled && (
                        <td
                          className="w-10 px-3 text-center"
                          onClick={(e) => toggleSelectRow(rowId, e)}
                        >
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      )}
                      {visibleColumns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            "dt-cell text-foreground/90",
                            density === "compact" ? "py-2 px-3 text-xs" : "py-3.5 px-4 text-sm",
                            c.className ?? ""
                          )}
                        >
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}

              {!isLoading && view.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + (selectionEnabled ? 1 : 0)}>
                    <EmptyState
                      variant={hasFilters || query ? "search" : emptyVariant}
                      query={query}
                      title={hasFilters || query ? undefined : emptyTitle}
                      description={hasFilters || query ? undefined : emptyDescription}
                      onClearFilters={hasFilters || query ? onClearFilters : undefined}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          totalPages={pages}
          totalItems={totalItems}
          pageSize={pageSize}
          visibleItems={view.length}
          onPageChange={changePage}
        />
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectionEnabled && selectedIds && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-primary/40 bg-card/95 px-5 py-3 shadow-2xl backdrop-blur-xl animate-fade-in">
          <span className="text-xs font-semibold text-foreground">
            <strong className="text-primary font-mono">{selectedIds.length}</strong> selected
          </span>
          <div className="h-4 w-px bg-border" />
          {bulkActions ? (
            bulkActions(selectedIds, () => onSelectionChange?.([]))
          ) : (
            <button
              type="button"
              onClick={() => onSelectionChange?.([])}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Deselect All
            </button>
          )}
          <button
            type="button"
            onClick={() => onSelectionChange?.([])}
            className="ml-2 rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
            title="Dismiss selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border/80 bg-input/90 px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-primary/25 focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/10">
      <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0! bg-transparent! text-sm outline-none! ring-0! shadow-none! placeholder:text-dim"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="rounded-lg p-1 text-dim transition hover:bg-white/5 hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function FilterToolbar({ children }: { children: ReactNode }) {
  return <div className="filter-toolbar">{children}</div>;
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 min-w-[140px] cursor-pointer appearance-none rounded-xl border border-border bg-input pl-3 pr-9 text-xs font-semibold text-foreground outline-none transition hover:border-primary/30 focus:border-primary/70"
      >
        {label && <option value="">{label}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronRight className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none text-muted-foreground" />
    </div>
  );
}

export function useFilters<T>(rows: T[], filters: Array<(row: T) => boolean>) {
  return useMemo(() => rows.filter((r) => filters.every((f) => f(r))), [rows, filters]);
}
