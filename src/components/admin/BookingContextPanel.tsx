import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/admin/ui";
import { fmtPKR } from "@/lib/format";
import { useBookingDetails, useBookingMessages } from "@/lib/api-hooks";

export function BookingContextPanel({ bookingId }: { bookingId?: string | null }) {
  const { data: booking, isLoading } = useBookingDetails(bookingId || "", !!bookingId);
  const { data: messages = [], isLoading: messagesLoading } = useBookingMessages(bookingId || "", !!bookingId);

  if (!bookingId) {
    return (
      <div className="rounded-2xl border border-border bg-surface-light/10 p-4 text-sm text-dim">
        No linked booking found for this record.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-light/10 p-6 text-sm text-dim">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading booking context...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-2xl border border-border bg-surface-light/10 p-4 text-sm text-dim">
        Booking details could not be loaded.
      </div>
    );
  }

  const customer = (booking as any).customer;
  const worker = (booking as any).worker;
  const payment = (booking as any).payment;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface-light/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-dim">Linked Booking</div>
          <div className="text-sm font-semibold text-white">#{String((booking as any)._id).slice(-8)}</div>
        </div>
        <StatusBadge status={(booking as any).status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[10px] uppercase text-dim">Customer</div>
          <div className="font-medium text-white">{customer?.fullName || "N/A"}</div>
          <div className="text-xs text-dim">{customer?.phone || ""}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-dim">Worker</div>
          <div className="font-medium text-white">{worker?.fullName || "N/A"}</div>
          <div className="text-xs text-dim">{worker?.phone || ""}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-dim">Category</div>
          <div className="font-medium text-white">{(booking as any).category || "N/A"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-dim">Total</div>
          <div className="font-medium text-primary">{fmtPKR((booking as any).totalAmount || 0)}</div>
        </div>
      </div>

      {payment && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-sm">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-dim">Payment Snapshot</div>
          <div className="grid grid-cols-2 gap-2">
            <div>Status: <span className="font-medium text-white">{payment.status}</span></div>
            <div>Amount: <span className="font-medium text-white">{fmtPKR(payment.amount || 0)}</span></div>
            <div>Commission: <span className="font-medium text-white">{fmtPKR(payment.platformFee || 0)}</span></div>
            <div>Worker earning: <span className="font-medium text-white">{fmtPKR(payment.workerEarning || 0)}</span></div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-dim">Booking Chat</div>
          <Link to="/bookings" className="text-[10px] font-semibold text-primary hover:underline">
            Open bookings
          </Link>
        </div>
        {messagesLoading ? (
          <div className="text-xs text-dim">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-xs text-dim">No chat messages for this booking.</div>
        ) : (
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-card/30 p-3">
            {messages.slice(-8).map((message: any) => (
              <div key={message._id} className="text-xs">
                <div className="font-semibold text-white/90">{message.senderType || message.senderRole || "User"}</div>
                <div className="text-muted-foreground">{message.text || message.content || message.message || "Attachment"}</div>
                <div className="text-[10px] text-dim">
                  {message.createdAt ? format(new Date(message.createdAt), "dd MMM, hh:mm a") : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
