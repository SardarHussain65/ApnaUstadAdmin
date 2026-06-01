import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useDeferredValue, useMemo } from "react";
import { useDisputes, useDisputeDetails, useResolveDispute } from "@/lib/api-hooks";
import { Drawer } from "@/components/admin/Drawer";
import { SearchInput, Select } from "@/components/admin/DataTable";
import { Badge, StatusBadge, Avatar } from "@/components/admin/ui";
import { 
  Scale, AlertTriangle, Eye, RefreshCw, Landmark, ShieldCheck, 
  CheckCircle2, XCircle, Clock, Check, Inbox, MessageSquare 
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { fmtPKR } from "@/lib/mock-data";

export const Route = createFileRoute("/_admin/disputes")({
  component: DisputesPage,
});

function DisputesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  // Selected dispute ID for details drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Resolution panel state
  const [resolutionStatus, setResolutionStatus] = useState<"resolved" | "dismissed" | "under_review" | "">("");
  const [adminNotes, setAdminNotes] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [triggerRefund, setTriggerRefund] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Queries & Mutations
  const { data: disputesData, isLoading, isFetching } = useDisputes({
    status: statusFilter || undefined,
    reason: reasonFilter || undefined
  });
  
  const { data: selectedDispute, isLoading: detailsLoading } = useDisputeDetails(selectedId || "", !!selectedId);
  const resolveMutation = useResolveDispute();

  const rawDisputes = disputesData?.data ?? disputesData;
  const disputes = Array.isArray(rawDisputes) ? rawDisputes : [];

  // Client side search filtering since backend search parameters are lightweight
  const filteredDisputes = useMemo(() => {
    return disputes.filter((d: any) => {
      if (!deferredSearch) return true;
      const targetStr = `${d._id} ${d.customer?.fullName} ${d.worker?.fullName} ${d.description} ${d.reason}`.toLowerCase();
      return targetStr.includes(deferredSearch.toLowerCase());
    });
  }, [disputes, deferredSearch]);

  const handleResolve = async () => {
    if (!selectedId || !resolutionStatus) return;
    try {
      await resolveMutation.mutateAsync({
        id: selectedId,
        status: resolutionStatus as any,
        adminNotes: adminNotes.trim(),
        resolutionDetails: resolutionDetails.trim(),
        refundAmount: triggerRefund ? Number(refundAmount) : 0
      });
      
      // Close drawer or refresh state
      setSelectedId(null);
      setResolutionStatus("");
      setAdminNotes("");
      setResolutionDetails("");
      setRefundAmount(0);
      setTriggerRefund(false);
    } catch (err) {
      // toast error handled in hook
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "incomplete_work": return "Incomplete Work";
      case "unfair_pricing": return "Unfair Pricing";
      case "no_show": return "No Show (Absent)";
      case "poor_quality": return "Poor Quality Work";
      case "payment_issue": return "Payment Dispute";
      default: return "Other Issue";
    }
  };

  const stats = useMemo(() => {
    return {
      total: disputes.length,
      open: disputes.filter((d: any) => d.status === "open").length,
      review: disputes.filter((d: any) => d.status === "under_review").length,
      resolved: disputes.filter((d: any) => d.status === "resolved" || d.status === "dismissed").length,
    };
  }, [disputes]);

  return (
    <div className="space-y-6">
      {/* 📊 Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-dim">Total Disputes</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400">{stats.open}</div>
            <div className="text-xs text-dim">Pending Action</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{stats.review}</div>
            <div className="text-xs text-dim">Under Review</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{stats.resolved}</div>
            <div className="text-xs text-dim">Resolved / Wiped</div>
          </div>
        </div>
      </div>

      {/* 🔍 Filters & Search */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search disputes by name, description or reason..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            label="All Statuses"
            options={[
              { value: "open", label: "Open / Unresolved" },
              { value: "under_review", label: "Under Review" },
              { value: "resolved", label: "Resolved" },
              { value: "dismissed", label: "Dismissed" }
            ]}
          />

          {/* Reason Filter */}
          <Select
            value={reasonFilter}
            onChange={setReasonFilter}
            label="All Dispute Reasons"
            options={[
              { value: "incomplete_work", label: "Incomplete Work" },
              { value: "unfair_pricing", label: "Unfair Pricing" },
              { value: "no_show", label: "No Show (Absent)" },
              { value: "poor_quality", label: "Poor Quality Work" },
              { value: "payment_issue", label: "Payment Dispute" },
              { value: "other", label: "Other" }
            ]}
          />
        </div>
      </div>

      {/* 📋 Disputes Table */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-dim">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <span>Fetching disputes backlog...</span>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-dim text-center">
            <Inbox className="w-12 h-12 mb-3 opacity-30 text-muted-foreground" />
            <span className="text-sm font-semibold text-white">No disputes raised</span>
            <span className="text-xs opacity-75 mt-1">Excellent! No client or worker disputes are pending review.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-xs font-semibold text-dim uppercase tracking-wider bg-surface-light/10">
                  <th className="p-4 pl-6">Raised By</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Worker</th>
                  <th className="p-4">Booking / Category</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Disputed Amt</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDisputes.map((dispute: any) => (
                  <tr
                    key={dispute._id}
                    onClick={() => {
                      setSelectedId(dispute._id);
                      setResolutionStatus(dispute.status !== "open" && dispute.status !== "under_review" ? dispute.status : "");
                      setAdminNotes(dispute.adminNotes || "");
                      setResolutionDetails(dispute.resolutionDetails || "");
                      setRefundAmount(dispute.amountDisputed || 0);
                      setTriggerRefund(false);
                    }}
                    className="hover:bg-surface-light/10 transition cursor-pointer group text-sm"
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-2">
                        <Badge variant={dispute.raisedByType === "customer" ? "info" : "orange"}>
                          {dispute.raisedByType === "customer" ? "Customer" : "Worker"}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-white">
                      {dispute.customer?.fullName || "Anonymous Customer"}
                    </td>
                    <td className="p-4 font-semibold text-accent">
                      {dispute.worker?.fullName || "Unnamed Worker"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{dispute.booking?.category || "Service Booking"}</span>
                        <span className="font-mono text-[10px] text-primary mt-0.5">#{dispute.booking?._id?.slice(-6) || "N/A"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-light text-slate-200 border border-border">
                        {getReasonLabel(dispute.reason)}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-rose-400">
                      {fmtPKR(dispute.amountDisputed || 0)}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={dispute.status} />
                    </td>
                    <td className="p-4 pr-6 text-right" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedId(dispute._id);
                          setResolutionStatus(dispute.status !== "open" && dispute.status !== "under_review" ? dispute.status : "");
                          setAdminNotes(dispute.adminNotes || "");
                          setResolutionDetails(dispute.resolutionDetails || "");
                          setRefundAmount(dispute.amountDisputed || 0);
                          setTriggerRefund(false);
                        }}
                        className="p-2 rounded-lg hover:bg-surface-light/40 text-dim hover:text-white transition"
                        title="View dispute logs"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔍 Details Drawer */}
      <Drawer
        open={!!selectedId}
        onClose={() => {
          setSelectedId(null);
          setResolutionStatus("");
          setAdminNotes("");
          setResolutionDetails("");
          setRefundAmount(0);
          setTriggerRefund(false);
        }}
        title="Dispute Resolution Center"
        width="max-w-2xl"
      >
        {detailsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-dim">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
            <span>Fetching dispute evidence details...</span>
          </div>
        ) : selectedDispute ? (
          <div className="space-y-6">
            
            {/* Header statistics info */}
            <div className="p-4 rounded-2xl border border-border bg-surface-light/10 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase text-dim font-bold block mb-1">Dispute Status</span>
                  <StatusBadge status={selectedDispute.status} />
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-dim font-bold block mb-1">Disputed Amount</span>
                  <span className="text-lg font-black text-rose-400">{fmtPKR(selectedDispute.amountDisputed || 0)}</span>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase text-dim font-bold block">Dispute Reason</span>
                  <span className="text-sm font-semibold text-white">{getReasonLabel(selectedDispute.reason)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-dim font-bold block">Date Filed</span>
                  <span className="text-sm font-semibold text-white">
                    {selectedDispute.createdAt ? format(new Date(selectedDispute.createdAt), "dd MMM yyyy, hh:mm a") : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Complaint details */}
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-dim font-bold">Dispute Description</span>
              <p className="p-4 bg-input border border-border rounded-xl text-sm text-slate-100 leading-relaxed italic">
                "{selectedDispute.description}"
              </p>
            </div>

            {/* Proof Images Section */}
            {selectedDispute.proofImages && selectedDispute.proofImages.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-dim font-bold">Evidence Attachments ({selectedDispute.proofImages.length})</span>
                <div className="grid grid-cols-3 gap-2">
                  {selectedDispute.proofImages.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setLightbox(img)}
                      className="aspect-square rounded-xl overflow-hidden border border-border bg-surface hover:border-primary transition"
                    >
                      <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-border" />

            {/* Parties Involved Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer */}
              <div className="p-3.5 bg-surface-light/10 border border-border rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={selectedDispute.customer?.profileImage} name={selectedDispute.customer?.fullName} size={38} />
                  <div>
                    <span className="text-[9px] uppercase text-dim font-bold block mb-0.5">Customer</span>
                    <span className="text-sm font-bold text-white leading-none">{selectedDispute.customer?.fullName || "Anonymous"}</span>
                    {selectedDispute.customer?._id && (
                      <span className="text-[9px] text-muted-foreground font-mono block mt-1">ID: #{selectedDispute.customer._id.slice(-6)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Worker */}
              <div className="p-3.5 bg-surface-light/10 border border-border rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={selectedDispute.worker?.profileImage} name={selectedDispute.worker?.fullName} size={38} />
                  <div>
                    <span className="text-[9px] uppercase text-dim font-bold block mb-0.5">Worker</span>
                    <span className="text-sm font-bold text-accent leading-none">{selectedDispute.worker?.fullName || "Unnamed"}</span>
                    {selectedDispute.worker?._id && (
                      <Link
                        to="/workers/$id"
                        params={{ id: selectedDispute.worker._id }}
                        onClick={() => setSelectedId(null)}
                        className="text-[9px] text-primary font-bold hover:underline block mt-1"
                      >
                        View Profile
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* Administrative Resolution Controls */}
            {selectedDispute.status !== "resolved" && selectedDispute.status !== "dismissed" ? (
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-primary" /> Administrative Action panel
                </h4>

                <div className="space-y-3">
                  {/* Select status override */}
                  <div>
                    <label className="text-[10px] uppercase text-dim font-bold block mb-1.5">Action Status Override</label>
                    <select
                      value={resolutionStatus}
                      onChange={e => setResolutionStatus(e.target.value as any)}
                      className="w-full h-11 px-3.5 rounded-xl bg-input border border-border text-sm text-white focus:border-primary focus:outline-none"
                    >
                      <option value="">Select Action Override...</option>
                      <option value="under_review">Mark Under Review (Investigation)</option>
                      <option value="resolved">Approve Dispute & Resolve Booking</option>
                      <option value="dismissed">Dismiss Dispute (Wipe Complaint)</option>
                    </select>
                  </div>

                  {/* Refund Trigger */}
                  {resolutionStatus === "resolved" && selectedDispute.amountDisputed > 0 && (
                    <div className="p-4 rounded-xl border border-border bg-rose-500/5 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={triggerRefund}
                          onChange={e => setTriggerRefund(e.target.checked)}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-rose-300 uppercase">Apply Wallet Adjustment Deduct on Worker</span>
                      </label>
                      
                      {triggerRefund && (
                        <div>
                          <label className="text-[10px] uppercase text-dim font-bold block mb-1">Deduction Amount (PKR)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={refundAmount}
                              onChange={e => setRefundAmount(Number(e.target.value))}
                              max={selectedDispute.amountDisputed}
                              min={0}
                              className="w-32 h-10 px-3 rounded-xl bg-input border border-border font-bold text-white text-sm focus:border-primary focus:outline-none"
                            />
                            <span className="text-xs text-dim">Limit: Up to {fmtPKR(selectedDispute.amountDisputed)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolution details */}
                  <div>
                    <label className="text-[10px] uppercase text-dim font-bold block mb-1.5">Resolution Details / Explanation</label>
                    <textarea
                      value={resolutionDetails}
                      onChange={e => setResolutionDetails(e.target.value)}
                      placeholder="Explain details of the dispute resolution..."
                      rows={3}
                      className="w-full p-3.5 rounded-xl bg-input border border-border text-sm text-white focus:border-primary focus:outline-none resize-none"
                    />
                  </div>

                  {/* Admin notes */}
                  <div>
                    <label className="text-[10px] uppercase text-dim font-bold block mb-1.5">Internal Admin Notes (Optional)</label>
                    <input
                      type="text"
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Internal metadata comments..."
                      className="w-full h-11 px-3.5 rounded-xl bg-input border border-border text-sm text-white focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleResolve}
                  disabled={!resolutionStatus || resolveMutation.isPending}
                  className="btn-press w-full h-12 rounded-xl gradient-cyan text-background font-bold glow-cyan flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                >
                  {resolveMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-background" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-background" />
                  )}
                  Save & Apply Dispute Resolution
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border/80 bg-emerald-500/5 space-y-4">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Dispute Resolution Logged
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-dim font-bold block">Resolved By</span>
                    <span className="font-semibold text-white">{selectedDispute.resolvedBy?.fullName || "System Admin"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-dim font-bold block">Resolution Date</span>
                    <span className="font-semibold text-white">
                      {selectedDispute.resolvedAt ? format(new Date(selectedDispute.resolvedAt), "dd MMM yyyy, hh:mm a") : "N/A"}
                    </span>
                  </div>
                  {selectedDispute.resolutionDetails && (
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase text-dim font-bold block mb-0.5">Resolution Notes</span>
                      <p className="p-3 rounded-lg bg-surface text-muted-foreground leading-relaxed italic border border-border/40">
                        "{selectedDispute.resolutionDetails}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm">Dispute log details not available</div>
        )}
      </Drawer>

      {/* Proof Lightbox */}
      {lightbox && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-fade-in" 
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 p-2 rounded-xl glass text-white"><XCircle className="w-6 h-6" /></button>
          <img src={lightbox} alt="zoom proof" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
