import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/admin/ui";
import { BookingTrackingMap } from "@/components/admin/BookingTrackingMap";
import { fmtPKR } from "@/lib/format";
import { useBookingDetails, useBookingMessages } from "@/lib/api-hooks";

export function BookingContextPanel({ bookingId }: { bookingId?: string | null }) {
  const { data: booking, isLoading } = useBookingDetails(bookingId || "", !!bookingId);
  const { data: messages = [], isLoading: messagesLoading } = useBookingMessages(bookingId || "", !!bookingId);

  if (!bookingId) {
    return (
      <div className="rounded-xl border border-hairline bg-surface p-4 text-sm text-muted-foreground">
        No linked booking found for this record.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-hairline bg-surface p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading booking context...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="rounded-xl border border-hairline bg-surface p-4 text-sm text-muted-foreground">
        Booking details could not be loaded.
      </div>
    );
  }

  const resolvedId = String((booking as any)._id || bookingId);
  const customer = (booking as any).customer;
  const worker = (booking as any).worker;
  const payment = (booking as any).payment;

  return (
    <div className="space-y-4 rounded-xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Linked Booking</div>
          <Link
            to="/bookings/$id"
            params={{ id: resolvedId }}
            className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-primary hover:underline"
          >
            #{resolvedId.slice(-8)} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={(booking as any).status} />
          <Link
            to="/bookings/$id"
            params={{ id: resolvedId }}
            className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary"
          >
            Full Booking <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Customer</div>
          {customer?._id ? (
            <Link
              to="/users/$id"
              params={{ id: String(customer._id) }}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {customer.fullName || "Customer"}
            </Link>
          ) : (
            <div className="font-medium text-foreground">{customer?.fullName || "N/A"}</div>
          )}
          <div className="font-mono text-xs text-muted-foreground">{customer?.phone || ""}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Ustad</div>
          {worker?._id ? (
            <Link
              to="/workers/$id"
              params={{ id: String(worker._id) }}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {worker.fullName || "Ustad"}
            </Link>
          ) : (
            <div className="font-medium text-foreground">{worker?.fullName || "N/A"}</div>
          )}
          <div className="font-mono text-xs text-muted-foreground">{worker?.phone || ""}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Category</div>
          <div className="font-medium text-foreground">{(booking as any).category || "N/A"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Total</div>
          <div className="font-mono font-semibold tabular-nums text-primary">
            {fmtPKR((booking as any).totalAmount || 0)}
          </div>
        </div>
      </div>

      {payment && (
        <div className="rounded-xl border border-hairline bg-card p-3 text-xs">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Payment Snapshot
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              Status: <span className="font-semibold text-foreground">{payment.status}</span>
            </div>
            <div>
              Amount: <span className="font-mono font-semibold text-foreground">{fmtPKR(payment.amount || 0)}</span>
            </div>
            <div>
              Commission: <span className="font-mono font-semibold text-foreground">{fmtPKR(payment.platformFee || 0)}</span>
            </div>
            <div>
              Worker Earning:{" "}
              <span className="font-mono font-semibold text-emerald-500">{fmtPKR(payment.workerEarning || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Live MapTiler Location & Dispatch Map for the Linked Booking */}
      <BookingTrackingMap booking={booking} compact />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Booking Chat Transcript ({messages.length})
          </div>
          <Link
            to="/bookings/$id"
            params={{ id: resolvedId }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            Inspect full booking <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {messagesLoading ? (
          <div className="text-xs text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-xs text-muted-foreground">No chat messages recorded for this booking.</div>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-hairline bg-card p-3">
            {messages.slice(-12).map((message: any) => (
              <div key={message._id} className="rounded-lg border border-hairline bg-surface/60 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold uppercase tracking-wider text-foreground">
                    {message.senderType || message.senderRole || "Participant"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {message.createdAt ? format(new Date(message.createdAt), "dd MMM, hh:mm a") : ""}
                  </span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  {message.text || message.content || message.message || "Attachment"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
