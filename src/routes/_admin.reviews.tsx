import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { RatingStars } from "@/components/admin/ui";
import { reviews as initial } from "@/lib/mock-data";
import { format } from "date-fns";
import { toast } from "sonner";

import { useReviews, useDeleteReview } from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/reviews")({ component: ReviewsPage });

function ReviewsPage() {
  const [q, setQ] = useState("");
  const [r, setR] = useState("");

  const { data, isLoading } = useReviews();
  const deleteMutation = useDeleteReview();

  const allReviews = (data as any) || [];

  const rows = useMemo(() => allReviews.filter((rv: any) => {
    if (q && !`${rv.worker?.fullName}${rv.customer?.fullName}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (r && rv.rating !== +r) return false;
    return true;
  }), [allReviews, q, r]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search reviews..." />
        <Select value={r} onChange={setR} label="All Ratings" options={[1,2,3,4,5].map(n=>({value:String(n),label:`${n} Stars`}))} />
      </div>
      <DataTable isLoading={isLoading} rows={rows} columns={[
        { key: "c", header: "Customer", render: rv => rv.customer?.fullName || 'Unknown' },
        { key: "w", header: "Worker", render: rv => <span className="text-accent">{rv.worker?.fullName || 'Unknown'}</span> },
        { key: "r", header: "Rating", render: rv => <RatingStars rating={rv.rating} /> },
        { key: "cm", header: "Comment", render: rv => <span title={rv.comment} className="text-sm text-muted-foreground line-clamp-1 max-w-xs block">{rv.comment}</span> },
        { key: "b", header: "Booking", render: rv => <span className="font-mono text-xs text-primary">{rv.booking?._id?.slice(-6) || 'N/A'}</span> },
        { key: "d", header: "Date", render: rv => <span className="text-xs text-muted-foreground">{rv.createdAt ? format(new Date(rv.createdAt), "dd MMM yyyy") : 'N/A'}</span> },
        { key: "a", header: "", render: rv => (
          <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(rv._id); }} className="p-2 rounded-lg hover:bg-destructive/15 hover:text-destructive" disabled={deleteMutation.isPending}>
            <Trash2 className="w-4 h-4" />
          </button>
        )},
      ]} />
    </div>
  );
}
