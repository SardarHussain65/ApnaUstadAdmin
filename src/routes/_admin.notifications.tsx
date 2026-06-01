import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { Rocket, Search, X, Calendar, FileText, CheckCircle2, AlertCircle, Users, User, Clock, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBadge, Badge } from "@/components/admin/ui";
import { useAdminNotifications, useBroadcastNotification, useUsers, useWorkers, type AdminNotification } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/notifications")({ component: NotificationsPage });

const TEMPLATES = [
  {
    name: "System Maintenance",
    title: "Upcoming System Maintenance 🕒",
    body: "Please note that ApnaUstad will undergo scheduled system maintenance on Sunday at 2:00 AM PKT. The app may be offline for up to 1 hour.",
    type: "general"
  },
  {
    name: "Promo Discount Code",
    title: "Get 15% Off Your Next Booking! 🎉",
    body: "Use promo code APNA15 at checkout to enjoy a 15% discount on any service this weekend. Book now to secure your provider!",
    type: "general"
  },
  {
    name: "CNIC Verification Reminder",
    title: "Verify Your CNIC to Keep Working 🪪",
    body: "Important: Please upload a clear photo of your CNIC front and back in the Profile section to complete verification and keep receiving client bookings.",
    type: "worker_verified"
  },
  {
    name: "Profile Update Reminder",
    title: "Complete Your Profile and Get Hired! 💼",
    body: "Service providers with a completed bio, profile picture, and updated hourly rates receive 3x more bookings. Update your profile today!",
    type: "general"
  },
  {
    name: "Wallet Balance Alert",
    title: "Low Wallet Balance Warning ⚠️",
    body: "Your wallet balance is below the minimum threshold. Please top up your wallet to continue accepting client bookings.",
    type: "wallet_topup"
  }
];

function NotificationsPage() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState("Everyone");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("general");
  const [scheduledAt, setScheduledAt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = useAdminNotifications({ grouped: true, limit: 50 });
  const broadcastMutation = useBroadcastNotification();

  // Suggestion search queries
  const targetIsUser = target === "Single User";
  const targetIsWorker = target === "Single Worker";

  const { data: usersData, isLoading: isUsersLoading } = useUsers(
    targetIsUser ? { search: searchQuery, limit: 10 } : { page: -1 }
  );

  const { data: workersData, isLoading: isWorkersLoading } = useWorkers(
    targetIsWorker ? { search: searchQuery, limit: 10 } : { page: -1 }
  );

  const suggestions = useMemo(() => {
    if (targetIsUser) return usersData?.users || [];
    if (targetIsWorker) return workersData || [];
    return [];
  }, [targetIsUser, targetIsWorker, usersData, workersData]);

  const isSearching = targetIsUser ? isUsersLoading : isWorkersLoading;

  // Handle clicking outside suggestions to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateName = e.target.value;
    if (!templateName) return;
    const found = TEMPLATES.find(t => t.name === templateName);
    if (found) {
      setTitle(found.title);
      setBody(found.body);
      setType(found.type);
      toast.success(`Loaded template: ${templateName}`);
    }
    e.target.value = ""; // Reset dropdown
  };

  const send = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Title and body are required");

    if (["Single User", "Single Worker"].includes(target) && !selectedRecipient) {
      return toast.error("Please search and select a recipient");
    }

    const payload: any = {
      target: (target === "All Users"
        ? "users"
        : target === "All Workers"
        ? "workers"
        : target === "Single User"
        ? "user"
        : target === "Single Worker"
        ? "worker"
        : "all") as any,
      title,
      body,
      type,
    };

    if (["Single User", "Single Worker"].includes(target)) {
      payload.recipientId = selectedRecipient._id;
    }

    if (scheduledAt) {
      payload.scheduledAt = new Date(scheduledAt).toISOString();
    }

    try {
      await broadcastMutation.mutateAsync(payload);
      toast.success(scheduledAt ? "Notification scheduled successfully" : "Notification sent successfully");
      
      // Reset form
      setTitle("");
      setBody("");
      setScheduledAt("");
      setSelectedRecipient(null);
      setSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send notification");
    }
  };

  const isFormValid = title.trim().length > 0 && body.trim().length > 0 && 
    (!["Single User", "Single Worker"].includes(target) || selectedRecipient);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Sender Panel */}
      <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Send Notification
          </h3>
          {/* Template Quick Select */}
          <select 
            onChange={selectTemplate}
            className="h-8 px-2 rounded-lg bg-surface-light border border-border text-xs focus:outline-none focus:border-primary"
          >
            <option value="">Load Template...</option>
            {TEMPLATES.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {/* Target Selection */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Target Audience</label>
            <select 
              value={target} 
              onChange={e => {
                setTarget(e.target.value);
                setSelectedRecipient(null);
                setSearchQuery("");
              }} 
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none text-sm"
            >
              <option>Everyone</option>
              <option>All Users</option>
              <option>All Workers</option>
              <option>Single User</option>
              <option>Single Worker</option>
            </select>
          </div>

          {/* Autocomplete for targeting single user/worker */}
          {["Single User", "Single Worker"].includes(target) && (
            <div className="relative" ref={suggestionsRef}>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Search {target === "Single User" ? "User" : "Worker"}
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full h-11 pl-9 pr-9 rounded-xl bg-input border border-border focus:border-primary focus:outline-none text-sm"
                  placeholder={`Search by name or phone...`}
                />
                {selectedRecipient && (
                  <button
                    onClick={() => {
                      setSelectedRecipient(null);
                      setSearchQuery("");
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Suggestions List */}
              {showSuggestions && searchQuery.trim().length > 0 && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-popover border border-border py-1 shadow-lg text-sm">
                  {isSearching ? (
                    <div className="p-3 text-muted-foreground text-center text-xs">Searching...</div>
                  ) : suggestions.length === 0 ? (
                    <div className="p-3 text-muted-foreground text-center text-xs">No results found</div>
                  ) : (
                    suggestions.map((item: any) => (
                      <button
                        key={item._id}
                        onClick={() => {
                          setSelectedRecipient(item);
                          setSearchQuery(item.fullName || item.phone);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-surface-light flex items-center justify-between border-b border-border/40 last:border-b-0"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{item.fullName || 'Unnamed'}</div>
                          <div className="text-xs text-muted-foreground">{item.phone}</div>
                        </div>
                        {item.city && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold uppercase">
                            {item.city}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedRecipient && (
                <div className="mt-2 p-2.5 rounded-xl bg-surface-light border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-xs font-semibold">{selectedRecipient.fullName || 'Unnamed'}</div>
                      <div className="text-[10px] text-muted-foreground">{selectedRecipient.phone}</div>
                    </div>
                  </div>
                  <Badge variant="info">Selected</Badge>
                </div>
              )}
            </div>
          )}

          {/* Type Select */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Notification Type</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)} 
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none text-sm"
            >
              <option value="general">General Broadcast</option>
              <option value="booking_cancelled">Booking Cancelled</option>
              <option value="payment_received">Payment Notification</option>
              <option value="worker_verified">Worker Verification Update</option>
              <option value="wallet_topup">Wallet Top-up Alert</option>
            </select>
          </div>

          {/* Title input */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex justify-between">
              <span>Title</span><span>{title.length}/100</span>
            </label>
            <input 
              maxLength={100} 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none text-sm" 
              placeholder="Enter notification title" 
            />
          </div>

          {/* Body Textarea */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex justify-between">
              <span>Body</span><span>{body.length}/300</span>
            </label>
            <textarea 
              maxLength={300} 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              className="mt-1 w-full h-24 p-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none text-sm resize-none" 
              placeholder="Enter notification message..." 
            />
          </div>

          {/* Schedule Send Datepicker */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex justify-between">
              <span>Schedule Send (Optional)</span>
              {scheduledAt && (
                <button onClick={() => setScheduledAt("")} className="text-destructive hover:underline text-[10px]">
                  Clear Schedule
                </button>
              )}
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none text-sm text-foreground"
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} // minimum 1 minute from now
              />
            </div>
          </div>

          <button
            onClick={send}
            disabled={broadcastMutation.isPending || !isFormValid}
            className="btn-press w-full h-12 rounded-xl gradient-purple text-white font-bold glow-purple flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {scheduledAt ? <Calendar className="w-4 h-4" /> : <Rocket className="w-4 h-4" />} 
            {broadcastMutation.isPending 
              ? (scheduledAt ? "Scheduling..." : "Sending...") 
              : (scheduledAt ? "Schedule Delivery" : "Send Now")}
          </button>
        </div>
      </div>

      {/* Log Panel */}
      <div className="lg:col-span-7 bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card">
          <h3 className="font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Delivery Logs & Stats
          </h3>
          {isFetching && <span className="text-[10px] text-muted-foreground animate-pulse">Syncing logs...</span>}
        </div>
        
        <div className="divide-y divide-border max-h-[700px] overflow-y-auto bg-card">
          {isLoading && (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading delivery history...</div>
          )}
          {!isLoading && (!data?.notifications || data.notifications.length === 0) && (
            <div className="p-8 text-center text-sm text-muted-foreground">No notification logs recorded yet.</div>
          )}
          
          {data?.notifications?.map((n) => {
            const isPendingSchedule = n.scheduledAt && n.deliveryStatus === 'created' && new Date(n.scheduledAt).getTime() > Date.now();
            
            return (
              <div key={n._id} className="p-4 hover:bg-surface-light/30 transition animate-fade-in space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{n.title}</span>
                      {n.isBroadcast ? (
                        <Badge variant="purple">Broadcast</Badge>
                      ) : (
                        <Badge variant="orange">Targeted</Badge>
                      )}
                      {isPendingSchedule && (
                        <Badge variant="warning" pulse>Scheduled</Badge>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {n.isBroadcast ? (
                      <Badge variant="muted">N = {n.totalCount}</Badge>
                    ) : (
                      <StatusBadge status={n.deliveryStatus || 'created'} />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/30 pt-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {n.isBroadcast ? (
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>To: {n.recipientType === 'worker' ? 'All Workers' : n.recipientType === 'user' ? 'All Users' : 'Everyone'}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>
                          Recipient: {n.recipient?.fullName || 'Unnamed'} ({n.recipient?.phone || 'No phone'})
                        </span>
                      </span>
                    )}

                    <span>·</span>
                    
                    <span>
                      {isPendingSchedule 
                        ? `Scheduled: ${format(new Date(n.scheduledAt!), "dd MMM yyyy, HH:mm")}`
                        : `Sent: ${format(new Date(n.sentAt || n.createdAt || Date.now()), "dd MMM yyyy, HH:mm")}`
                      }
                    </span>
                  </div>

                  {/* Broadcast delivery breakdown stats */}
                  {n.isBroadcast && (
                    <div className="flex items-center gap-2">
                      <span className="text-success font-medium">✓ {n.sentCount} sent</span>
                      <span>·</span>
                      <span className="text-primary font-medium">👁 {n.readCount} read</span>
                      {n.failedCount! > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-destructive font-medium">✗ {n.failedCount} failed</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
