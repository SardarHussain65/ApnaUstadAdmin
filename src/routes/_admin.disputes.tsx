import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useDeferredValue, useEffect, useMemo } from "react";
import { useDisputesPage, useDisputeDetails, useResolveDispute } from "@/lib/api-hooks";
import { Drawer } from "@/components/admin/Drawer";
import { PaginationBar, SearchInput, Select } from "@/components/admin/DataTable";
import { Badge, StatusBadge, Avatar } from "@/components/admin/ui";
import { 
  Scale, AlertTriangle, Eye, RefreshCw, Landmark, ShieldCheck, 
  CheckCircle2, XCircle, Clock, Check, Inbox, MessageSquare 
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { BookingContextPanel } from "@/components/admin/BookingContextPanel";
import { fmtPKR } from "@/lib/format";

export const Route = createFileRoute("/_admin/disputes")({
  component: DisputesPage,
});

function DisputesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);

  // Selected dispute ID for details drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Resolution panel state
  const [resolutionStatus, setResolutionStatus] = useState<"resolved" | "dismissed" | "under_review" | "">("");
  const [adminNotes, setAdminNotes] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [triggerRefund, setTriggerRefund] = useState(false);
  const [workerPenalty, setWorkerPenalty] = useState(0);
  const [triggerPenalty, setTriggerPenalty] = useState(false);
  const [warnCustomer, setWarnCustomer] = useState(false);
  const [warnWorker, setWarnWorker] = useState(false);
  const [blockCustomer, setBlockCustomer] = useState(false);
  const [blockWorker, setBlockWorker] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Queries & Mutations
  useEffect(() => { setPage(1); }, [statusFilter, reasonFilter, deferredSearch]);

  const { data: disputesData, isLoading, isFetching } = useDisputesPage({
    page,
    limit: 10,
    status: statusFilter || undefined,
    reason: reasonFilter || undefined,
    search: deferredSearch || undefined,
  });
  
  const { data: selectedDispute, isLoading: detailsLoading } = useDisputeDetails(selectedId || "", !!selectedId);
  const resolveMutation = useResolveDispute();

  const disputes = disputesData?.items || [];

  const resetModerationState = () => {
    setResolutionStatus("");
    setAdminNotes("");
    setResolutionDetails("");
    setRefundAmount(0);
    setTriggerRefund(false);
    setWorkerPenalty(0);
    setTriggerPenalty(false);
    setWarnCustomer(false);
    setWarnWorker(false);
    setBlockCustomer(false);
    setBlockWorker(false);
    setBlockReason("");
  };

  const handleResolve = async () => {
    if (!selectedId || !resolutionStatus) return;
    if ((blockCustomer || blockWorker) && !blockReason.trim()) {
      toast.error("Please enter a reason before blocking an account");
      return;
    }
    try {
      await resolveMutation.mutateAsync({
        id: selectedId,
        status: resolutionStatus as any,
        adminNotes: adminNotes.trim(),
        resolutionDetails: resolutionDetails.trim(),
        refundAmount: triggerRefund ? Number(refundAmount) : 0,
        moderation: {
          warnCustomer,
          warnWorker,
          workerPenalty: triggerPenalty ? Number(workerPenalty) : 0,
          blockCustomer,
          blockWorker,
          blockReason: blockReason.trim(),
        },
      });
      
      setSelectedId(null);
      resetModerationState();
    } catch (err) {
      // toast error handled in hook
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "incomplete_work": return "Work not completed";
      case "unfair_pricing": return "Overcharged / unfair price";
      case "no_show": return "Ustad did not show up";
      case "poor_quality": return "Poor workmanship";
      case "payment_issue": return "Cash payment issue";
      default: return "Other problem";
    }
  };

  const getActionHint = (action: string) => {
    switch (action) {
      case "under_review": return "Mark as under investigation. Cash payment stays on hold.";
      case "resolved": return "Rule in customer's favour. Optionally credit customer wallet from Ustad balance.";
      case "dismissed": return "Complaint not upheld. Release payment to Ustad and close the case.";
      default: return "";
    }
  };

  const stats = useMemo(() => {
    return {
      total: disputesData?.pagination.totalItems ?? 0,
      open: disputes.filter((d: any) => d.status === "open").length,
      review: disputes.filter((d: any) => d.status === "under_review").length,
      resolved: disputes.filter((d: any) => d.status === "resolved" || d.status === "dismissed").length,
    };
  }, [disputes, disputesData?.pagination.totalItems]);

  useEffect(() => {
    if (resolutionStatus === "resolved" && selectedDispute?.amountDisputed) {
      setTriggerRefund(true);
      setRefundAmount(selectedDispute.amountDisputed);
    } else if (resolutionStatus === "dismissed") {
      setTriggerRefund(false);
      setRefundAmount(0);
      setTriggerPenalty(false);
      setWorkerPenalty(0);
      setWarnWorker(false);
      setBlockWorker(false);
    } else if (resolutionStatus === "resolved") {
      setWarnCustomer(false);
      setBlockCustomer(false);
    }
  }, [resolutionStatus, selectedDispute?.amountDisputed]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground leading-relaxed">
        <strong className="text-white">Pakistan cash-booking complaints:</strong> Users report from the mobile app — no amount is typed by them. Job value is taken from the booking. While open, cash confirmation is blocked. Resolve fairly: investigate → favour customer (wallet refund) or favour Ustad (release payment).
      </div>
      {/* 📊 Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-dim">Total complaints</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/15 flex items-center justify-center text-destructive">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-destructive">{stats.open}</div>
            <div className="text-xs text-dim">Awaiting review</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center text-gold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gold">{stats.review}</div>
            <div className="text-xs text-dim">Visible Under Review</div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center text-success">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-success">{stats.resolved}</div>
            <div className="text-xs text-dim">Visible Resolved</div>
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
              { value: "incomplete_work", label: "Work not completed" },
              { value: "unfair_pricing", label: "Overcharged" },
              { value: "no_show", label: "Ustad no-show" },
              { value: "poor_quality", label: "Poor workmanship" },
              { value: "payment_issue", label: "Cash payment issue" },
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
        ) : disputes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-dim text-center">
            <Inbox className="w-12 h-12 mb-3 opacity-30 text-muted-foreground" />
            <span className="text-sm font-semibold text-white">No disputes raised</span>
            <span className="text-xs opacity-75 mt-1 max-w-sm">Customers and workers report issues from the mobile app under job details → Report a problem.</span>
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
                  <th className="p-4">Job amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {disputes.map((dispute: any) => (
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
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-light text-foreground/90 border border-border">
                        {getReasonLabel(dispute.reason)}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-primary">
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
        <PaginationBar
          page={page}
          totalPages={disputesData?.pagination.totalPages ?? 1}
          totalItems={disputesData?.pagination.totalItems ?? 0}
          pageSize={10}
          visibleItems={disputes.length}
          onPageChange={setPage}
        />
      </div>

      {/* 🔍 Details Drawer */}
      <Drawer
        open={!!selectedId}
        onClose={() => {
          setSelectedId(null);
          resetModerationState();
        }}
        title="Complaint Resolution"
        width="max-w-5xl"
      >
        {detailsLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-dim">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
            <span>Fetching dispute evidence details...</span>
          </div>
        ) : selectedDispute ? (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            {/* Left — case evidence & booking context */}
            <div className="space-y-5 min-w-0">
            {/* Header statistics info */}
            <div className="p-4 rounded-2xl border border-border bg-surface-light/10 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase text-dim font-bold block mb-1">Dispute Status</span>
                  <StatusBadge status={selectedDispute.status} />
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-dim font-bold block mb-1">Job amount (PKR)</span>
                  <span className="text-lg font-black text-primary">{fmtPKR(selectedDispute.amountDisputed || 0)}</span>
                  <span className="text-[10px] text-dim block mt-0.5">Auto from booking — not entered by user</span>
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
              <p className="p-4 bg-input border border-border rounded-xl text-sm text-foreground/90 leading-relaxed italic">
                "{selectedDispute.description}"
              </p>
            </div>

            {/* Proof Images Section */}
            {selectedDispute.proofImages && selectedDispute.proofImages.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-dim font-bold">Evidence Attachments ({selectedDispute.proofImages.length})</span>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedDispute.proofImages.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setLightbox(img)}
                      className="group aspect-[4/3] rounded-xl overflow-hidden border border-border bg-surface hover:border-primary transition"
                    >
                      <img src={img} alt="Evidence" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <BookingContextPanel bookingId={selectedDispute.booking?._id || selectedDispute.booking} />
            </div>

            {/* Right — parties & resolution */}
            <div className="space-y-5 min-w-0">
            {/* Parties Involved Grid */}
            <div className="grid grid-cols-1 gap-3">
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

            {/* Administrative Resolution Controls */}
            {selectedDispute.status !== "resolved" && selectedDispute.status !== "dismissed" ? (
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-primary" /> Admin decision
                </h4>
                <p className="text-xs text-dim leading-relaxed">
                  Hear both sides using chat and evidence below. Choose one outcome — customers and Ustads are notified automatically.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase text-dim font-bold block mb-1.5">Your decision</label>
                    <select
                      value={resolutionStatus}
                      onChange={e => setResolutionStatus(e.target.value as any)}
                      className="w-full h-11 px-3.5 rounded-xl bg-input border border-border text-sm text-white focus:border-primary focus:outline-none"
                    >
                      <option value="">Select outcome...</option>
                      <option value="under_review">Start investigation</option>
                      <option value="resolved">Favour customer — resolve complaint</option>
                      <option value="dismissed">Favour Ustad — dismiss complaint</option>
                    </select>
                    {resolutionStatus ? (
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{getActionHint(resolutionStatus)}</p>
                    ) : null}
                  </div>

                  {resolutionStatus === "resolved" && selectedDispute.amountDisputed > 0 && (
                    <div className="p-4 rounded-xl border border-border bg-success/5 space-y-3">
                      <p className="text-[10px] uppercase font-bold text-dim">If Ustad was at fault</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={triggerRefund}
                          onChange={e => setTriggerRefund(e.target.checked)}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-success uppercase">Refund customer wallet (deduct from Ustad)</span>
                      </label>
                      
                      {triggerRefund && (
                        <div>
                          <label className="text-[10px] uppercase text-dim font-bold block mb-1">Refund amount (PKR)</label>
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="number"
                              value={refundAmount}
                              onChange={e => setRefundAmount(Number(e.target.value))}
                              max={selectedDispute.amountDisputed}
                              min={0}
                              className="w-36 h-10 px-3 rounded-xl bg-input border border-border font-bold text-white text-sm focus:border-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setRefundAmount(selectedDispute.amountDisputed)}
                              className="text-xs font-bold text-primary hover:underline"
                            >
                              Full job amount ({fmtPKR(selectedDispute.amountDisputed)})
                            </button>
                          </div>
                        </div>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={triggerPenalty}
                          onChange={e => setTriggerPenalty(e.target.checked)}
                          className="w-4 h-4 accent-gold rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gold uppercase">Extra Ustad penalty (no customer refund)</span>
                      </label>
                      {triggerPenalty && (
                        <div>
                          <label className="text-[10px] uppercase text-dim font-bold block mb-1">Penalty amount (PKR)</label>
                          <input
                            type="number"
                            value={workerPenalty}
                            onChange={e => setWorkerPenalty(Number(e.target.value))}
                            min={0}
                            className="w-36 h-10 px-3 rounded-xl bg-input border border-border font-bold text-white text-sm focus:border-primary focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2 pt-1 border-t border-border/50">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={warnWorker} onChange={e => setWarnWorker(e.target.checked)} className="w-4 h-4 accent-primary rounded" />
                          <span className="text-xs text-white">Send official warning to Ustad</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={blockWorker} onChange={e => setBlockWorker(e.target.checked)} className="w-4 h-4 accent-destructive rounded" />
                          <span className="text-xs text-destructive font-semibold">Block / suspend Ustad account</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {resolutionStatus === "dismissed" && (
                    <div className="p-4 rounded-xl border border-border bg-destructive/5 space-y-2">
                      <p className="text-[10px] uppercase font-bold text-dim">If customer was at fault</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={warnCustomer} onChange={e => setWarnCustomer(e.target.checked)} className="w-4 h-4 accent-primary rounded" />
                        <span className="text-xs text-white">Send official warning to customer</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={blockCustomer} onChange={e => setBlockCustomer(e.target.checked)} className="w-4 h-4 accent-destructive rounded" />
                        <span className="text-xs text-destructive font-semibold">Block / suspend customer account</span>
                      </label>
                    </div>
                  )}

                  {(blockCustomer || blockWorker) && (
                    <div>
                      <label className="text-[10px] uppercase text-destructive font-bold block mb-1.5">Block reason (required)</label>
                      <input
                        type="text"
                        value={blockReason}
                        onChange={e => setBlockReason(e.target.value)}
                        placeholder="e.g. Repeated false complaints / poor service / fraud"
                        className="w-full h-11 px-3.5 rounded-xl bg-input border border-destructive/40 text-sm text-white focus:border-destructive focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] uppercase text-dim font-bold block mb-1.5">Message to both parties</label>
                    <textarea
                      value={resolutionDetails}
                      onChange={e => setResolutionDetails(e.target.value)}
                      placeholder="Explain your decision in plain language (shown to customer & Ustad)..."
                      rows={5}
                      className="w-full p-3.5 rounded-xl bg-input border border-border text-sm text-white focus:border-primary focus:outline-none resize-y min-h-[120px]"
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
                  Save decision & notify parties
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-border/80 bg-success/5 space-y-4">
                <h4 className="text-sm font-bold text-success flex items-center gap-1.5">
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
                  {selectedDispute.resolutionDetails ? (
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase text-dim font-bold block mb-0.5">Resolution Notes</span>
                      <p className="p-3 rounded-lg bg-surface text-muted-foreground leading-relaxed italic border border-border/40">
                        "{selectedDispute.resolutionDetails}"
                      </p>
                    </div>
                  ) : null}
                  {selectedDispute.moderationApplied ? (
                    <div className="col-span-2 p-3 rounded-lg bg-surface border border-border/40 text-xs space-y-1">
                      <span className="text-[10px] uppercase text-dim font-bold block">Actions applied</span>
                      {selectedDispute.moderationApplied.warnedCustomer ? <div>• Customer warned</div> : null}
                      {selectedDispute.moderationApplied.warnedWorker ? <div>• Ustad warned</div> : null}
                      {(selectedDispute.moderationApplied.customerRefund ?? 0) > 0 ? <div>• Refund {fmtPKR(selectedDispute.moderationApplied.customerRefund)}</div> : null}
                      {(selectedDispute.moderationApplied.workerPenalty ?? 0) > 0 ? <div>• Ustad penalty {fmtPKR(selectedDispute.moderationApplied.workerPenalty)}</div> : null}
                      {selectedDispute.moderationApplied.customerBlocked ? <div className="text-destructive">• Customer blocked</div> : null}
                      {selectedDispute.moderationApplied.workerBlocked ? <div className="text-destructive">• Ustad blocked</div> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm">Dispute log details not available</div>
        )}
      </Drawer>

      {/* Proof Lightbox */}
      {lightbox && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Dispute evidence preview"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-fade-in" 
          onClick={() => setLightbox(null)}
        >
          <button aria-label="Close evidence preview" className="absolute top-4 right-4 p-2 rounded-xl glass text-white"><XCircle className="w-6 h-6" /></button>
          <img src={lightbox} alt="zoom proof" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
