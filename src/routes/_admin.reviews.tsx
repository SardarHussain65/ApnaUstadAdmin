import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { RatingStars } from "@/components/admin/ui";
import { reviews as initial } from "@/lib/mock-data";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/reviews")({ component: ReviewsPage });

function ReviewsPage() {
  const [reviews, setReviews] = useState(initial);
  const [q, setQ] = useState("");
  const [r, setR] = useState("");

  const rows = useMemo(() => reviews.filter(rv => {
    if (q && !`${rv.workerName}${rv.customerName}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (r && rv.rating !== +r) return false;
    return true;
  }), [reviews, q, r]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search reviews..." />
        <Select value={r} onChange={setR} label="All Ratings" options={[1,2,3,4,5].map(n=>({value:String(n),label:`${n} Stars`}))} />
      </div>
      <DataTable rows={rows} columns={[
        { key: "c", header: "Customer", render: rv => rv.customerName },
        { key: "w", header: "Worker", render: rv => <span className="text-accent">{rv.workerName}</span> },
        { key: "r", header: "Rating", render: rv => <RatingStars rating={rv.rating} /> },
        { key: "cm", header: "Comment", render: rv => <span title={rv.comment} className="text-sm text-muted-foreground line-clamp-1 max-w-xs block">{rv.comment}</span> },
        { key: "b", header: "Booking", render: rv => <span className="font-mono text-xs text-primary">{rv.bookingId}</span> },
        { key: "d", header: "Date", render: rv => <span className="text-xs text-muted-foreground">{format(new Date(rv.createdAt), "dd MMM yyyy")}</span> },
        { key: "a", header: "", render: rv => (
          <button onClick={(e) => { e.stopPropagation(); setReviews(p => p.filter(x => x.id !== rv.id)); toast.success("Review deleted"); }} className="p-2 rounded-lg hover:bg-destructive/15 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
        )},
      ]} />
    </div>
  );
}
