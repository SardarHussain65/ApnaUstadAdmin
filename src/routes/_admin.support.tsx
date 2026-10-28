import { createFileRoute } from "@tanstack/react-router";
import { useState, useDeferredValue, useEffect } from "react";
import {
  useSupportRequestsPage,
  useReplySupportRequest,
  useUpdateSupportStatus,
  useUpdateSupportPriority,
  useAddSupportInternalNote,
  SupportRequest,
} from "@/lib/api-hooks";
import { BookingContextPanel } from "@/components/admin/BookingContextPanel";
import { AdminPageHeader, StatChip } from "@/components/admin/AdminPageHeader";
import { PaginationBar, SearchInput } from "@/components/admin/DataTable";
import {
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Mail,
  Tag,
  Send,
  MessageCircle,
  Inbox,
  AlertCircle,
  Filter,
  Check,
  Lock,
  StickyNote,
  Shield,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { shortId } from "@/lib/format";

export const Route = createFileRoute("/_admin/support")({ component: SupportPage });

const QUICK_TEMPLATES = [
  { label: "Choose a quick response template...", value: "" },
  {
    label: "Acknowledge & Investigating",
    value: "Assalam-o-Alaikum! We have received your query regarding Apna Ustad. Our operations team is investigating this issue and will update you shortly.",
  },
  {
    label: "Wallet Top-up Credited",
    value: "Assalam-o-Alaikum. Your wallet deposit has been verified and credited to your account. Please check your app wallet balance.",
  },
  {
    label: "Request Proof / Screenshot",
    value: "Please share a clear screenshot of the transaction receipt or issue so our support specialists can assist you without delay.",
  },
  {
    label: "Dispute Decision Shared",
    value: "The dispute regarding your booking has been reviewed in accordance with Apna Ustad terms of service. The resolution has been applied.",
  },
  {
    label: "Issue Resolved (Close Ticket)",
    value: "Hi! This issue has now been resolved. Thank you for using Apna Ustad. If you have any further questions, please let us know.",
  },
];

function SupportPage() {
  // Filters state
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const deferredSearch = useDeferredValue(search);

  const [page, setPage] = useState(1);

  // Selected ticket
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Right pane tab: 'conversation' vs 'internal_notes'
  const [activeTab, setActiveTab] = useState<"conversation" | "internal_notes">("conversation");

  // Input states
  const [replyText, setReplyText] = useState("");
  const [internalNoteText, setInternalNoteText] = useState("");

  // Queries & Mutations
  useEffect(() => {
    setPage(1);
  }, [status, priority, deferredSearch]);

  const { data: supportData, isLoading } = useSupportRequestsPage({
    page,
    limit: 20,
    status: status || undefined,
    priority: priority || undefined,
    search: deferredSearch || undefined,
  });
  const requests = supportData?.items || [];

  const replyMutation = useReplySupportRequest();
  const statusMutation = useUpdateSupportStatus();
  const priorityMutation = useUpdateSupportPriority();
  const noteMutation = useAddSupportInternalNote();

  // Find currently selected request
  const selectedRequest = requests.find((r) => r._id === selectedId);

  // Stats calculation
  const totalOpen = requests.filter((r) => r.status === "open").length;
  const totalPending = requests.filter((r) => r.status === "pending").length;
  const totalClosed = requests.filter((r) => r.status === "closed").length;
  const totalUrgent = requests.filter((r) => r.priority === "urgent" && r.status !== "closed").length;

  const handleSendReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    try {
      await replyMutation.mutateAsync({
        id: selectedId,
        message: replyText.trim(),
      });
      setReplyText("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddInternalNote = async () => {
    if (!selectedId || !internalNoteText.trim()) return;
    try {
      await noteMutation.mutateAsync({
        id: selectedId,
        note: internalNoteText.trim(),
      });
      setInternalNoteText("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus: "open" | "closed" | "pending") => {
    if (!selectedId) return;
    try {
      await statusMutation.mutateAsync({ id: selectedId, status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriorityChange = async (newPriority: "low" | "medium" | "high" | "urgent") => {
    if (!selectedId) return;
    try {
      await priorityMutation.mutateAsync({ id: selectedId, priority: newPriority });
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case "urgent":
        return "bg-destructive/15 text-destructive border border-destructive/30";
      case "high":
        return "bg-gold/15 text-gold border border-gold/30";
      case "medium":
        return "bg-primary/15 text-primary border border-primary/30";
      default:
        return "bg-surface-light text-muted-foreground border border-border/40";
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case "open":
        return "bg-success/15 text-success border border-success/30";
      case "pending":
        return "bg-gold/15 text-gold border border-gold/30";
      default:
        return "bg-surface-light text-muted-foreground border border-border/40";
    }
  };

  const internalNotes: any[] = selectedRequest?.metadata?.internalNotes || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <AdminPageHeader
        title="Support Desk & Customer Tickets"
        description="Resolve customer and worker inquiries with SLA priority indicators, internal admin notes, and linked booking context."
        icon={<MessageSquare className="h-4 w-4" />}
        stats={
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatChip icon={<Inbox className="h-5 w-5" />} label="Open Tickets" value={totalOpen} tone="success" />
            <StatChip icon={<Clock className="h-5 w-5" />} label="Pending" value={totalPending} tone="gold" />
            <StatChip icon={<AlertCircle className="h-5 w-5" />} label="Urgent SLA" value={totalUrgent} tone="danger" />
            <StatChip icon={<CheckCircle className="h-5 w-5" />} label="Resolved" value={totalClosed} tone="muted" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-[660px]">
        {/* Left Side: Ticket List & Filters */}
        <div className="lg:col-span-5 flex flex-col app-glass rounded-[22px] p-4 overflow-hidden h-[700px] border border-border/80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search tickets by name, phone, topic..."
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50 text-white"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">Priority SLA</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50 text-white"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent (&lt;2h SLA)</option>
                <option value="high">High (&lt;6h SLA)</option>
                <option value="medium">Medium (&lt;24h SLA)</option>
                <option value="low">Low (&lt;48h SLA)</option>
              </select>
            </div>
          </div>

          <hr className="my-3 border-border/60" />

          {/* Scrollable ticket list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                <span>Loading support queue...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center">
                <Inbox className="w-10 h-10 mb-3 opacity-30" />
                <span className="text-sm font-semibold text-white">No requests found</span>
                <span className="text-xs opacity-75 mt-1">Try tweaking your search or filters</span>
              </div>
            ) : (
              requests.map((r) => {
                const isActive = r._id === selectedId;
                const hasReplies = r.replies && r.replies.length > 0;
                const hasNotes = (r.metadata?.internalNotes || []).length > 0;
                return (
                  <button
                    key={r._id}
                    onClick={() => setSelectedId(r._id)}
                    className={`w-full text-left rounded-2xl border p-3.5 transition-all duration-200 relative group flex flex-col gap-1.5 ${
                      isActive
                        ? "border-primary/50 bg-primary/10 shadow-[0_0_20px_rgba(0,245,255,0.1)]"
                        : "border-border/60 bg-surface/50 hover:border-primary/30 hover:bg-surface-light"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-white group-hover:text-primary transition-colors line-clamp-1">
                        {r.name || "Anonymous User"}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                        {r.createdAt ? format(new Date(r.createdAt), "dd MMM") : ""}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-accent line-clamp-1">
                      {r.topic || "General Support"}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {r.message}
                    </p>

                    <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-border/40">
                      <div className="flex gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusBadgeClass(r.status)}`}>
                          {r.status}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getPriorityBadgeClass(r.priority)}`}>
                          {r.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasNotes && (
                          <span className="text-[10px] text-gold flex items-center gap-0.5 font-bold" title="Internal Notes">
                            <StickyNote className="w-3 h-3" />
                          </span>
                        )}
                        {hasReplies && (
                          <div className="flex items-center gap-1 text-[10px] text-primary/80 font-mono">
                            <MessageSquare className="w-3 h-3" />
                            <span>{r.replies?.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <PaginationBar
            page={page}
            totalPages={supportData?.pagination.totalPages ?? 1}
            totalItems={supportData?.pagination.totalItems ?? 0}
            pageSize={20}
            visibleItems={requests.length}
            onPageChange={setPage}
          />
        </div>

        {/* Right Side: Conversation Thread & Actions */}
        <div className="lg:col-span-7 flex flex-col app-glass rounded-[22px] overflow-hidden h-[700px] border border-border/80">
          {selectedRequest ? (
            <div className="flex flex-col h-full">
              {/* Conversation Top Header */}
              <div className="p-4 bg-surface-light/40 border-b border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                    {(selectedRequest.name || "A")[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white leading-tight">
                      {selectedRequest.name || "Anonymous User"}
                    </h4>
                    <span className="text-xs text-muted-foreground font-mono">
                      {selectedRequest.email || "No email"} · ID: {shortId(selectedRequest._id)}
                    </span>
                  </div>
                </div>

                {/* Status & Priority Pipeline Controls */}
                <div className="flex items-center gap-2">
                  <div>
                    <select
                      value={selectedRequest.status}
                      onChange={(e) => handleStatusChange(e.target.value as any)}
                      className="p-1.5 bg-input border border-border rounded-xl text-xs font-bold text-white outline-none cursor-pointer focus:border-primary"
                    >
                      <option value="open">🟢 Open</option>
                      <option value="pending">🟡 Pending</option>
                      <option value="closed">⚪ Closed</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={selectedRequest.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as any)}
                      className="p-1.5 bg-input border border-border rounded-xl text-xs font-bold text-white outline-none cursor-pointer focus:border-primary"
                    >
                      <option value="urgent">🔴 Urgent (&lt;2h)</option>
                      <option value="high">🟠 High (&lt;6h)</option>
                      <option value="medium">🔵 Medium (&lt;24h)</option>
                      <option value="low">⚪ Low (&lt;48h)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Thread Tabs Header: Public Conversation vs Internal Team Notes */}
              <div className="flex items-center border-b border-border px-4 bg-surface/60">
                <button
                  type="button"
                  onClick={() => setActiveTab("conversation")}
                  className={`py-2.5 px-3 border-b-2 font-bold text-xs flex items-center gap-1.5 transition ${
                    activeTab === "conversation"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Customer Messages ({(selectedRequest.replies || []).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("internal_notes")}
                  className={`py-2.5 px-3 border-b-2 font-bold text-xs flex items-center gap-1.5 transition ${
                    activeTab === "internal_notes"
                      ? "border-gold text-gold"
                      : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-gold" />
                  <span>Internal Team Notes ({internalNotes.length})</span>
                </button>
              </div>

              {/* Thread Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* User's Original Message Card */}
                <div className="bg-surface-light/40 border border-border rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-primary">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{selectedRequest.topic || "General Support"}</span>
                    </div>
                    <span className="font-mono">
                      {selectedRequest.createdAt ? format(new Date(selectedRequest.createdAt), "dd MMM yyyy, HH:mm") : ""}
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                    {selectedRequest.message}
                  </div>
                </div>

                {/* Linked Booking Context Panel */}
                <BookingContextPanel
                  bookingId={selectedRequest.metadata?.bookingId || selectedRequest.metadata?.booking}
                />

                {/* TAB 1: Customer Conversation Replies */}
                {activeTab === "conversation" && (
                  <div className="space-y-3 pt-2">
                    {(selectedRequest.replies || []).length > 0 ? (
                      selectedRequest.replies!.map((reply, idx) => {
                        const isAdmin = reply.from === "admin";
                        return (
                          <div
                            key={idx}
                            className={`flex flex-col max-w-[85%] rounded-2xl p-3.5 space-y-1.5 animate-fade-in ${
                              isAdmin
                                ? "bg-primary/10 border border-primary/20 self-end ml-auto"
                                : "bg-surface-light border border-border mr-auto"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-8 text-[10px] font-bold">
                              <span className={isAdmin ? "text-primary" : "text-white"}>
                                {reply.authorName || (isAdmin ? "Apna Ustad Support" : selectedRequest.name)}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                {reply.createdAt ? format(new Date(reply.createdAt), "HH:mm") : ""}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">
                              {reply.message}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-xs opacity-70">
                        No responses posted yet. Send a message to the customer below.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Private Internal Team Notes */}
                {activeTab === "internal_notes" && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 rounded-xl bg-gold/10 border border-gold/25 text-xs text-gold flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>Private notes are visible ONLY to Apna Ustad administrators and agents. Never sent to users.</span>
                    </div>

                    {internalNotes.length > 0 ? (
                      internalNotes.map((note: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-gold/5 border border-gold/20 space-y-1.5 animate-fade-in"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-gold flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {note.authorName || "Admin Agent"}
                            </span>
                            <span className="text-muted-foreground font-mono">
                              {note.createdAt ? format(new Date(note.createdAt), "dd MMM yyyy, HH:mm") : "Just now"}
                            </span>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
                            {note.note}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-xs opacity-70">
                        No internal notes logged yet. Use the note input below to document investigation steps.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat Input / Action Section */}
              <div className="p-4 bg-surface-light/40 border-t border-border space-y-3">
                {activeTab === "conversation" ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      {/* Quick responses select */}
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setReplyText(e.target.value);
                          }
                          e.target.value = "";
                        }}
                        className="p-1.5 flex-1 bg-input border border-border rounded-xl text-xs outline-none max-w-[340px] text-white"
                      >
                        {QUICK_TEMPLATES.map((tpl, i) => (
                          <option key={i} value={tpl.value}>
                            {tpl.label}
                          </option>
                        ))}
                      </select>

                      {selectedRequest.status === "closed" && (
                        <span className="text-[10px] text-muted-foreground italic">
                          Ticket closed (reply will reopen)
                        </span>
                      )}
                    </div>

                    <div className="flex items-end gap-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type response sent directly to the customer..."
                        rows={3}
                        className="flex-1 p-3 rounded-xl bg-input border border-border focus:border-primary text-xs outline-none resize-none transition text-white"
                      />
                      <button
                        type="button"
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || replyMutation.isPending}
                        className="btn-press h-[44px] w-[44px] rounded-xl gradient-cyan text-background flex items-center justify-center glow-cyan disabled:opacity-50 cursor-pointer shadow-lg shrink-0"
                        title="Send reply to customer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Add Private Admin Audit Note</span>
                    </div>
                    <div className="flex items-end gap-3">
                      <textarea
                        value={internalNoteText}
                        onChange={(e) => setInternalNoteText(e.target.value)}
                        placeholder="Add confidential notes (e.g. called user via Jazz number, confirmed payment)..."
                        rows={3}
                        className="flex-1 p-3 rounded-xl bg-input border border-gold/30 focus:border-gold text-xs outline-none resize-none transition text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddInternalNote}
                        disabled={!internalNoteText.trim() || noteMutation.isPending}
                        className="btn-press h-[44px] w-[44px] rounded-xl bg-gold text-background font-black flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-lg shrink-0"
                        title="Save internal note"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-white">No Ticket Selected</h4>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
                Select a support ticket from the queue to view messages, priority status, and post replies or internal notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
