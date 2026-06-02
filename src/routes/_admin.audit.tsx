import { createFileRoute } from "@tanstack/react-router";
import { useState, useDeferredValue } from "react";
import { useAuditLogs } from "@/lib/api-hooks";
import { Drawer } from "@/components/admin/Drawer";
import { SearchInput, Select } from "@/components/admin/DataTable";
import { Badge } from "@/components/admin/ui";
import { Eye, Shield, Calendar, User, Layers, Info, ChevronLeft, ChevronRight } from "lucide-react";

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
                      <div className="font-semibold text-white">
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
                    <td className="py-3 px-4 text-white font-medium">{log.entityType}</td>
                    <td className="py-3 px-4 text-xs font-mono text-dim whitespace-nowrap truncate max-w-[120px]" title={log.entityId}>
                      {log.entityId || "N/A"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-xs truncate" title={log.reason || ""}>
                      {log.reason || <span className="text-dim">No description provided</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg border border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition"
                        title="Inspect Metadata"
                      >
                        <Eye className="w-4 h-4" />
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

            {/* JSON Metadata Viewer */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary" />
                <span>Extended Log Metadata</span>
              </div>
              <pre className="bg-[#05050A] p-4 rounded-xl text-xs overflow-auto border border-border text-primary font-mono leading-relaxed max-h-[300px]">
                {JSON.stringify(
                  {
                    ipAddress: selectedLog.ipAddress,
                    userAgent: selectedLog.userAgent,
                    metadata: selectedLog.metadata || {},
                    id: selectedLog._id
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
