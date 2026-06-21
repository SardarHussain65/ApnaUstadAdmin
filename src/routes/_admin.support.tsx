import { createFileRoute } from "@tanstack/react-router";
import { useState, useDeferredValue, useEffect } from "react";
import {
  useSupportRequestsPage,
  useReplySupportRequest,
  useUpdateSupportStatus,
  useUpdateSupportPriority,
  SupportRequest
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
  Check
} from "lucide-react";

export const Route = createFileRoute("/_admin/support")({ component: SupportPage });

const QUICK_TEMPLATES = [
  { label: "Choose a quick response...", value: "" },
  { label: "Query Received (Acknowledge)", value: "Hello! We have received your query and our team is looking into it. We will get back to you shortly." },
  { label: "Issue Resolved (Close)", value: "Hi! This issue has been successfully resolved. If you have any further questions, feel free to contact us." },
  { label: "Request More Details", value: "Hello. Please provide more details or screenshots (if possible) regarding this issue so we can assist you better." },
  { label: "Wallet Adjust Done", value: "Hi. The wallet adjustment / recharge has been processed. Please check your app wallet balance." }
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

  // Reply text state
  const [replyText, setReplyText] = useState("");

  // Queries & Mutations
  useEffect(() => { setPage(1); }, [status, priority, deferredSearch]);

  const { data: supportData, isLoading } = useSupportRequestsPage({
    page,
    limit: 20,
    status: status || undefined,
    priority: priority || undefined,
    search: deferredSearch || undefined
  });
  const requests = supportData?.items || [];

  const replyMutation = useReplySupportRequest();
  const statusMutation = useUpdateSupportStatus();
  const priorityMutation = useUpdateSupportPriority();

  // Find currently selected request
  const selectedRequest = requests.find((r) => r._id === selectedId);

  // In-memory calculations for stats from all tickets (fetched limit 200)
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
        return "bg-destructive/10 text-destructive border border-destructive/20";
      case "high":
        return "bg-gold/10 text-gold border border-gold/20";
      case "medium":
        return "bg-primary/10 text-primary border border-primary/20";
      default:
        return "bg-surface-light/10 text-muted-foreground border border-border/20";
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case "open":
        return "bg-success/10 text-success border border-success/20";
      case "pending":
        return "bg-gold/10 text-gold border border-gold/20";
      default:
        return "bg-surface-light/10 text-muted-foreground border border-border/20";
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Support Desk"
        description="Resolve customer and worker tickets with quick replies, priority controls, and linked booking context."
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        stats={
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatChip icon={<Inbox className="h-5 w-5" />} label="Open" value={totalOpen} tone="success" />
            <StatChip icon={<Clock className="h-5 w-5" />} label="Pending" value={totalPending} tone="gold" />
            <StatChip icon={<AlertCircle className="h-5 w-5" />} label="Urgent" value={totalUrgent} tone="danger" />
            <StatChip icon={<CheckCircle className="h-5 w-5" />} label="Closed (page)" value={totalClosed} tone="muted" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 min-h-[650px]">
        
        {/* Left Side: Ticket List & Filters */}
        <div className="lg:col-span-5 flex flex-col app-glass rounded-[22px] p-4 overflow-hidden h-[680px]">
          
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by user name, email, topic..."
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-dim font-semibold uppercase block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="text-[10px] text-dim font-semibold uppercase block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <hr className="my-4 border-white/8" />

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-dim">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                <span>Loading support requests...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-dim text-center">
                <Inbox className="w-10 h-10 mb-3 opacity-30" />
                <span className="text-sm font-medium">No requests found</span>
                <span className="text-xs opacity-75 mt-1">Try tweaking your search or filters</span>
              </div>
            ) : (
              requests.map((r) => {
                const isActive = r._id === selectedId;
                const hasReplies = r.replies && r.replies.length > 0;
                return (
                  <button
                    key={r._id}
                    onClick={() => setSelectedId(r._id)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 relative group flex flex-col gap-2 ${
                      isActive
                        ? "border-primary/40 bg-primary/10 shadow-[0_0_24px_rgba(0,245,255,0.12)]"
                        : "border-white/8 bg-white/[0.02] hover:border-primary/25 hover:bg-white/[0.04]"
                    }`}
                  >
                    {/* Active side indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-primary rounded-r-full" />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                        {r.name || "Anonymous"}
                      </span>
                      <span className="text-[10px] text-dim whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-dim line-clamp-1">
                      {r.topic || "General"}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {r.message}
                    </p>

                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/40">
                      <div className="flex gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusBadgeClass(r.status)}`}>
                          {r.status}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getPriorityBadgeClass(r.priority)}`}>
                          {r.priority}
                        </span>
                      </div>
                      
                      {hasReplies && (
                        <div className="flex items-center gap-1 text-[10px] text-primary/80 font-medium">
                          <MessageSquare className="w-3 h-3" />
                          <span>{r.replies?.length} replies</span>
                        </div>
                      )}
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

        {/* Right Side: Conversation Thread & Action Drawer */}
        <div className="lg:col-span-7 flex flex-col app-glass rounded-[22px] overflow-hidden h-[680px]">
          {selectedRequest ? (
            <div className="flex flex-col h-full">
              
              {/* Conversation Header */}
              <div className="p-4 bg-surface-light/35 border-b border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                    {(selectedRequest.name || "A")[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight">{selectedRequest.name || "Anonymous"}</h4>
                    <span className="text-xs text-dim">{selectedRequest.email || "No email provided"}</span>
                  </div>
                </div>

                {/* Quick Status / Priority Dropdowns */}
                <div className="flex items-center gap-2">
                  <div>
                    <select
                      value={selectedRequest.status}
                      onChange={(e) => handleStatusChange(e.target.value as any)}
                      className="p-1.5 bg-input border border-border rounded-lg text-xs outline-none cursor-pointer focus:border-primary/50"
                    >
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={selectedRequest.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as any)}
                      className="p-1.5 bg-input border border-border rounded-lg text-xs outline-none cursor-pointer focus:border-primary/50"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                
                {/* User's Original Issue Card */}
                <div className="bg-surface-light/20 border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-dim border-b border-border/40 pb-2">
                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{selectedRequest.topic || "General Inquiry"}</span>
                    </div>
                    <span>{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                    {selectedRequest.message}
                  </div>
                </div>

                <BookingContextPanel bookingId={selectedRequest.metadata?.bookingId || selectedRequest.metadata?.booking} />

                {/* Replies Thread */}
                {selectedRequest.replies && selectedRequest.replies.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-semibold text-dim uppercase tracking-wider flex items-center gap-2">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Conversation Thread</span>
                    </div>

                    {selectedRequest.replies.map((reply, idx) => {
                      const isAdmin = reply.from === "admin";
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col max-w-[85%] rounded-xl p-3.5 space-y-1.5 animate-fade-in ${
                            isAdmin
                              ? "bg-primary/10 border border-primary/20 self-end ml-auto"
                              : "bg-surface-light/30 border border-border mr-auto"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-8 text-[10px] font-semibold text-dim">
                            <span className={isAdmin ? "text-primary" : "text-white"}>
                              {reply.authorName || (isAdmin ? "Support Agent" : selectedRequest.name)}
                            </span>
                            <span>{new Date(reply.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-line">
                            {reply.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-dim text-center opacity-70">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-35 animate-pulse" />
                    <span className="text-xs">No replies sent yet. Send a response below.</span>
                  </div>
                )}
              </div>

              {/* Chat Input & Quick Templates */}
              <div className="p-4 bg-surface-light/35 border-t border-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  {/* Quick responses select */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setReplyText(e.target.value);
                      }
                      e.target.value = "";
                    }}
                    className="p-1.5 flex-1 bg-input border border-border rounded-lg text-xs outline-none max-w-[300px]"
                  >
                    {QUICK_TEMPLATES.map((tpl, i) => (
                      <option key={i} value={tpl.value}>
                        {tpl.label}
                      </option>
                    ))}
                  </select>

                  {/* Indicators */}
                  {selectedRequest.status === "closed" && (
                    <span className="text-[10px] text-dim italic">Ticket closed (sending reply will reopen)</span>
                  )}
                </div>

                <div className="flex items-end gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response to the customer..."
                    rows={3}
                    className="flex-1 p-3 rounded-xl bg-input border border-border focus:border-primary/50 text-sm outline-none resize-none transition"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="btn-press h-[44px] w-[44px] rounded-xl gradient-cyan text-background flex items-center justify-center glow-cyan disabled:opacity-50 disabled:scale-100 cursor-pointer shadow-lg"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[22px] border border-primary/20 bg-primary/10 text-primary">
                <MessageSquare className="h-9 w-9" />
              </div>
              <h4 className="text-lg font-bold text-white">No ticket selected</h4>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Pick a support ticket from the list to review details, update status, and send replies.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
