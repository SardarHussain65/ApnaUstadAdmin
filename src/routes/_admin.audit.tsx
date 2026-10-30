import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useDeferredValue } from "react";
import { useAuditLogs } from "@/lib/api-hooks";
import { Drawer } from "@/components/admin/Drawer";
import { SearchInput, Select } from "@/components/admin/DataTable";
import { Eye, Shield, User, Layers, Info, ChevronLeft, ChevronRight, Code, Globe, Laptop, ArrowUpRight } from "lucide-react";

function renderEntityLink(entityType?: string, entityId?: string) {
  if (!entityId) return <span className="text-muted-foreground">N/A</span>;
  const t = (entityType || "").toLowerCase();
  const short = entityId.length > 10 ? `#${entityId.slice(-8)}` : entityId;
  if (t === "user") {
    return (
      <Link to="/users/$id" params={{ id: entityId }} className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-primary hover:underline">
        {short} <ArrowUpRight className="h-3 w-3" />
      </Link>
    );
  }
  if (t === "worker") {
    return (
      <Link to="/workers/$id" params={{ id: entityId }} className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-primary hover:underline">
        {short} <ArrowUpRight className="h-3 w-3" />
      </Link>
    );
  }
  if (t === "booking") {
    return (
      <Link to="/bookings/$id" params={{ id: entityId }} className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-primary hover:underline">
        {short} <ArrowUpRight className="h-3 w-3" />
      </Link>
    );
  }
  if (t === "job" || t === "jobpost") {
    return (
      <Link to="/jobs/$id" params={{ id: entityId }} className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-primary hover:underline">
        {short} <ArrowUpRight className="h-3 w-3" />
      </Link>
    );
  }
  if (t === "dispute") {
    return (
      <Link to="/disputes/$id" params={{ id: entityId }} className="inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-primary hover:underline">
        {short} <ArrowUpRight className="h-3 w-3" />
      </Link>
    );
  }
  return <span className="font-mono text-xs text-muted-foreground" title={entityId}>{short}</span>;
}

export const Route = createFileRoute("/_admin/audit")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [entityType, setEntityType] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Queries
  const { data, isLoading } = useAuditLogs({
    page,
    limit: 15,
    search: deferredSearch || undefined,
    entityType: entityType || undefined,
    action: actionFilter || undefined
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination || { total: 0, page: 1, pages: 1 };

  const entityOptions = [
    { value: "User", label: "User" },
    { value: "Worker", label: "Worker" },
    { value: "Booking", label: "Booking" },
    { value: "Category", label: "Category" },
    { value: "Wallet", label: "Wallet" },
    { value: "SupportRequest", label: "Support Ticket" },
    { value: "Admin", label: "Admin" },
    { value: "Notification", label: "Notification" }
  ];

  const actionOptions = [
    { value: "CREATE", label: "Create" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
    { value: "BLOCK", label: "Block" },
    { value: "UNBLOCK", label: "Unblock" },
    { value: "VERIFY", label: "Verify" },
    { value: "REJECT", label: "Reject" },
    { value: "RECHARGE", label: "Recharge" },
    { value: "ADJUST", label: "Adjust" },
    { value: "REPLY", label: "Reply" }
  ];

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE")) return "bg-success/10 text-success border-success/30";
    if (act.includes("DELETE")) return "bg-destructive/10 text-destructive border-destructive/30";
    if (act.includes("BLOCK") || act.includes("REJECT")) return "bg-destructive/10 text-destructive border-destructive/30";
    if (act.includes("UNBLOCK") || act.includes("VERIFY") || act.includes("RECHARGE")) return "bg-primary/10 text-primary border-primary/30";
    return "bg-gold/10 text-gold border-gold/30";
  };

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, pagination.pages)));
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1); // Reset page on new search
          }}
          placeholder="Search by action, reason, entity ID..."
        />
        
        <Select
          value={entityType}
          onChange={(val) => {
            setEntityType(val);
            setPage(1);
          }}
          options={entityOptions}
          label="All Entity Types"
        />

        <Select
          value={actionFilter}
          onChange={(val) => {
            setActionFilter(val);
            setPage(1);
          }}
          options={actionOptions}
          label="All Actions"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="text-left py-3.5 px-4">Timestamp</th>
                <th className="text-left py-3.5 px-4">Actor (Admin)</th>
                <th className="text-left py-3.5 px-4">Action</th>
                <th className="text-left py-3.5 px-4">Entity Type</th>
                <th className="text-left py-3.5 px-4">Entity ID</th>
                <th className="text-left py-3.5 px-4">Reason / Description</th>
                <th className="text-center py-3.5 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    <div className="w-8 h-8 border-4 border-t-primary border-border rounded-full animate-spin mx-auto mb-3" />
                    Loading audit trail logs...
                  </td>
                </tr>
              )}

              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    <div className="text-3xl mb-2">🛡️</div>
                    No matching audit logs found.
                  </td>
                </tr>
              )}

              {!isLoading &&
                logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-surface-light/40 transition">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">
                        {log.actor?.fullName || "System/Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.actor?.email || log.ipAddress || ""}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">{log.entityType}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderEntityLink(log.entityType, log.entityId)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-xs truncate" title={log.reason || ""}>
                      {log.reason || <span className="text-muted-foreground/60">No description provided</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition"
                        title="Inspect Metadata"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!isLoading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface/50">
            <div className="text-xs text-muted-foreground">
              Total {pagination.total} audit records logs
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
                className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-surface-light"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs px-3">
                Page {page} of {pagination.pages}
              </span>
              <button
                disabled={page === pagination.pages}
                onClick={() => handlePageChange(page + 1)}
                className="p-1.5 rounded-lg border border-border disabled:opacity-30 hover:bg-surface-light"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Drawer */}
      <Drawer
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Entry Details"
      >
        {selectedLog && (
          <div className="space-y-6">
            {/* Header info card */}
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Action Performed</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mt-1 ${getActionColor(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Timestamp</div>
                  <div className="text-sm text-white font-medium mt-1">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="border-t border-border/60 my-1" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                    <User className="w-3 h-3" /> Actor (Admin)
                  </div>
                  <div className="text-sm text-white font-semibold mt-1">
                    {selectedLog.actor?.fullName || "System"}
                  </div>
                  <div className="text-xs text-dim">
                    Role: {selectedLog.actor?.role || "superadmin"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Target Entity
                  </div>
                  <div className="text-sm text-white font-semibold mt-1">
                    {selectedLog.entityType}
                  </div>
                  <div className="text-xs text-mono text-dim truncate max-w-[150px]" title={selectedLog.entityId}>
                    ID: {selectedLog.entityId || "N/A"}
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 my-1" />

              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1">
                  <Info className="w-3 h-3" /> Description / Reason
                </div>
                <div className="text-sm text-white mt-1">
                  {selectedLog.reason || "No explanation provided."}
                </div>
              </div>
            </div>

            {/* Visual Payload Diff Viewer */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary" />
                <span>Audit Payload & State Inspector</span>
              </div>
              <AuditPayloadDiffViewer log={selectedLog} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function AuditPayloadDiffViewer({ log }: { log: any }) {
  const meta = log.metadata || {};
  const hasDiff = (meta.before && meta.after) || (meta.old && meta.new) || (meta.previous && meta.updated);
  const beforeObj = meta.before || meta.old || meta.previous;
  const afterObj = meta.after || meta.new || meta.updated;

  // Extract changed keys if before/after objects exist
  const diffKeys = hasDiff && typeof beforeObj === 'object' && typeof afterObj === 'object'
    ? Array.from(new Set([...Object.keys(beforeObj || {}), ...Object.keys(afterObj || {})]))
    : [];

  const otherMetaEntries = Object.entries(meta).filter(
    ([k]) => !['before', 'after', 'old', 'new', 'previous', 'updated'].includes(k)
  );

  return (
    <div className="space-y-4">
      {/* Network & Session Info */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-surface-light border border-border flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary shrink-0" />
          <div className="truncate">
            <span className="text-dim block text-[10px] uppercase">IP Address</span>
            <span className="font-mono text-white font-medium">{log.ipAddress || '127.0.0.1'}</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-surface-light border border-border flex items-center gap-2">
          <Laptop className="w-4 h-4 text-primary shrink-0" />
          <div className="truncate">
            <span className="text-dim block text-[10px] uppercase">Client User Agent</span>
            <span className="font-mono text-white text-[11px] truncate block" title={log.userAgent || 'Internal System'}>
              {log.userAgent || 'Admin Console / Chrome'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Diff View if before/after exists */}
      {hasDiff && diffKeys.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-secondary" />
            <span>State Changes (Before ➔ After)</span>
          </div>
          <div className="space-y-2 border border-border rounded-xl p-3 bg-surface/50 divide-y divide-border/40">
            {diffKeys.map((k) => {
              const bVal = beforeObj ? JSON.stringify(beforeObj[k]) : 'undefined';
              const aVal = afterObj ? JSON.stringify(afterObj[k]) : 'undefined';
              const isChanged = bVal !== aVal;

              return (
                <div key={k} className="pt-2 first:pt-0">
                  <span className="font-mono text-xs font-bold text-dim block mb-1">{k}</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive line-through truncate">
                      {bVal}
                    </div>
                    <div className="p-2 rounded-lg bg-success/10 border border-success/20 text-success font-semibold flex items-center justify-between truncate">
                      <span className="truncate">{aVal}</span>
                      {isChanged && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success uppercase">Modified</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key-Value Metadata attributes */}
      {otherMetaEntries.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-white uppercase tracking-wider">Payload Parameters</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {otherMetaEntries.map(([k, v]) => (
              <div key={k} className="p-2.5 rounded-xl bg-surface-light border border-border">
                <span className="text-[10px] text-dim uppercase tracking-wider font-semibold block">{k}</span>
                <span className="text-xs font-mono text-white font-medium break-all mt-0.5 block">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Raw JSON */}
      <details className="group border border-hairline rounded-xl bg-surface text-xs">
        <summary className="cursor-pointer p-3 text-muted-foreground hover:text-foreground flex items-center justify-between font-mono select-none">
          <span className="flex items-center gap-1.5 font-sans font-semibold text-xs">
            <Code className="w-3.5 h-3.5 text-primary" /> Raw JSON Payload
          </span>
          <span className="text-[10px] text-muted-foreground group-open:rotate-90 transition-transform">▶</span>
        </summary>
        <pre className="p-3 pt-0 text-[11px] font-mono text-foreground overflow-x-auto leading-relaxed border-t border-hairline">
          {JSON.stringify({ ipAddress: log.ipAddress, userAgent: log.userAgent, metadata: log.metadata || {}, id: log._id }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
