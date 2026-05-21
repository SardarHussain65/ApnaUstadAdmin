import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_admin/support")({ component: SupportPage });

function SupportPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.get<any[]>("/support/requests");
        if (mounted) setList(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      const doc = await api.post<any>(`/support/requests/${id}/reply`, { message: replyText.trim(), authorName: 'Admin' });
      // update list
      setList(list.map(l => l._id === id ? doc : l));
      setReplyFor(null);
      setReplyText('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
      <h3 className="font-bold text-lg mb-4">Support Requests</h3>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {list.length === 0 && <div className="p-4 text-muted-foreground">No requests found</div>}
          {list.map((r: any) => (
            <div key={r._id} className="p-4 hover:bg-surface-light/40 transition animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{r.name || r.email || (r.user ? `User:${r.user}` : 'Anonymous')} {r.email && r.name ? `· ${r.email}` : ''}</div>
                <div className="text-sm text-dim">{new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">{r.topic || 'General'}</div>
              <div className="mt-3 text-sm">{r.message}</div>
              {r.replies && r.replies.length > 0 && (
                <div className="mt-3">
                  {r.replies.map((rep: any, idx: number) => (
                    <div key={idx} className="mt-2 p-3 bg-surface-light/30 rounded-lg">
                      <div className="text-sm font-semibold">{rep.authorName || (rep.from === 'admin' ? 'Admin' : 'User')}</div>
                      <div className="text-sm text-muted-foreground mt-1">{rep.message}</div>
                    </div>
                  ))}
                </div>
              )}

              {replyFor === r._id ? (
                <div className="mt-3">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)} className="w-full p-3 rounded-xl bg-input border border-border" rows={3} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => sendReply(r._id)} className="btn-press">Send Reply</button>
                    <button onClick={() => { setReplyFor(null); setReplyText(''); }} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <button onClick={() => setReplyFor(r._id)} className="text-sm text-primary">Reply</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
