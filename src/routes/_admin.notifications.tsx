import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Rocket } from "lucide-react";
import { notifications as initial, type Notification } from "@/lib/mock-data";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";
import { StatusBadge } from "@/components/admin/ui";

export const Route = createFileRoute("/_admin/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const [list, setList] = useState(initial);
  const [target, setTarget] = useState("All Users");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const send = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Title and body are required");
    try {
      const payload = { target: target === 'All Users' ? 'users' : target === 'All Workers' ? 'workers' : 'all', title, body };
      const resp = await api.post('/notifications/broadcast', payload);
      const result: any = resp || {};
      const successCount = result?.result?.successCount ?? 0;
      const failureCount = result?.result?.failureCount ?? 0;
      const n: Notification = { id: `N${Date.now()}`, title, body, target, sentAt: new Date().toISOString(), status: failureCount === 0 ? "delivered" : "failed" };
      setList([n, ...list]);
      setTitle(""); setBody("");
      toast.success(`🚀 Sent: ${successCount} delivered, ${failureCount} failed`);
    } catch (err: any) {
      console.error('Failed to send notification', err);
      toast.error('Failed to send');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <h3 className="font-bold text-lg mb-4">Send Notification</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Target Audience</label>
            <select value={target} onChange={e => setTarget(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none">
              <option>All Users</option><option>All Workers</option><option>Specific User</option><option>Specific Worker</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex justify-between">
              <span>Title</span><span>{title.length}/100</span>
            </label>
            <input maxLength={100} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" placeholder="Notification title" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex justify-between">
              <span>Body</span><span>{body.length}/300</span>
            </label>
            <textarea maxLength={300} value={body} onChange={e => setBody(e.target.value)} className="mt-1 w-full h-28 p-3 rounded-xl bg-input border border-border focus:border-primary focus:outline-none" placeholder="Notification body..." />
          </div>
          <button onClick={send} className="btn-press w-full h-12 rounded-xl gradient-purple text-white font-bold glow-purple flex items-center justify-center gap-2">
            <Rocket className="w-4 h-4" /> Send Now
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h3 className="font-bold">Notification Log</h3></div>
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {list.map(n => (
            <div key={n.id} className="p-4 hover:bg-surface-light/40 transition animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{n.title}</div>
                <StatusBadge status={n.status} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">{n.body}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-dim">
                <span>→ {n.target}</span><span>·</span><span>{format(new Date(n.sentAt), "dd MMM yyyy, HH:mm")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
