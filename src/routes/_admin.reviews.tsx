import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Search,
  Star,
  Eye,
  Sparkles,
  AlertTriangle,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import {
  useReviewsPage,
  useDeleteReview,
  useCategories,
  useToggleFlagReview,
} from "@/lib/api-hooks";
import { RatingStars, Avatar, Badge } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { PaginationBar } from "@/components/admin/DataTable";
import { shortId } from "@/lib/format";

export const Route = createFileRoute("/_admin/reviews")({
  component: ReviewsPage,
});

function ReviewsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(searchQuery);

  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<any | null>(null);

  const dateFrom = useMemo(() => {
    if (!dateFilter) return undefined;
    const from = new Date();
    if (dateFilter === "today") from.setHours(from.getHours() - 24);
    if (dateFilter === "week") from.setDate(from.getDate() - 7);
    if (dateFilter === "month") from.setDate(from.getDate() - 30);
    return from.toISOString();
  }, [dateFilter]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, selectedRating, selectedCategory, dateFrom]);

  const { data: reviewsData, isLoading } = useReviewsPage({
    page,
    limit: 10,
    search: deferredSearch,
    rating: selectedRating ? Number(selectedRating) : undefined,
    category: selectedCategory,
    dateFrom,
  });
  const { data: categories = [] } = useCategories();
  const deleteMutation = useDeleteReview();
  const flagMutation = useToggleFlagReview();

  const reviewsList = reviewsData?.items || [];

  const handleFlagReview = async (id: string) => {
    const review = reviewsList.find((r: any) => r._id === id);
    const isCurrentlyFlagged = review?.isFlagged || selectedReview?.isFlagged;
    const reason = isCurrentlyFlagged ? "Unflagged by Admin" : "Flagged by Admin";
    try {
      await flagMutation.mutateAsync({ id, reason });
      if (selectedReview && selectedReview._id === id) {
        setSelectedReview((prev: any) => ({ ...prev, isFlagged: !prev.isFlagged }));
      }
    } catch {
      // handled in mutation hook
    }
  };

  const stats = useMemo(() => {
    const total = reviewsList.length;
    if (total === 0)
      return {
        total: 0,
        average: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
      };

    const sum = reviewsList.reduce((acc: number, r: any) => acc + r.rating, 0);
    const average = Math.round((sum / total) * 10) / 10;

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsList.forEach((r: any) => {
      const rounded = Math.round(r.rating);
      if (rounded >= 1 && rounded <= 5) {
        distribution[rounded]++;
      }
    });

    return { total, average, distribution };
  }, [reviewsList]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Customer Reviews
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor service feedback, star ratings, and moderate customer reviews.
        </p>
      </div>

      {/* Rating Distribution & Stats */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <div className="flex flex-col items-center justify-center rounded-xl border border-hairline bg-card p-5 text-center md:col-span-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visible Page Average
          </div>
          <div className="flex items-baseline gap-1 font-mono text-5xl font-extrabold tracking-tight text-foreground">
            {stats.average}
            <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
          </div>
          <div className="mt-2.5">
            <RatingStars rating={stats.average} size={18} />
          </div>
          <div className="mt-3 text-xs font-medium text-muted-foreground">
            Based on {stats.total} visible · {reviewsData?.pagination.totalItems ?? 0} total matching
          </div>
        </div>

        <div className="space-y-2.5 rounded-xl border border-hairline bg-card p-5 md:col-span-8">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Rating Distribution (Click bar to filter)</span>
          </div>

          {[5, 4, 3, 2, 1].map((stars) => {
            const count = stats.distribution[stars] || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <button
                key={stars}
                type="button"
                onClick={() =>
                  setSelectedRating(selectedRating === String(stars) ? "" : String(stars))
                }
                className={`group flex w-full items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-surface ${
                  selectedRating === String(stars) ? "bg-surface" : ""
                }`}
              >
                <span className="flex w-10 items-center gap-1 text-xs font-semibold text-foreground">
                  {stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full border border-hairline bg-surface">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-xs text-muted-foreground group-hover:text-foreground">
                  {count} ({Math.round(pct)}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-hairline bg-card p-4 md:flex-row md:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Ustad, Customer, or review comment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-hairline bg-surface pl-9 pr-4 text-sm text-foreground outline-none transition focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-lg border border-hairline bg-surface px-3 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c._id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="h-9 rounded-lg border border-hairline bg-surface px-3 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n} Stars
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 rounded-lg border border-hairline bg-surface px-3 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="">All Time</option>
            <option value="today">Past 24 Hours</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="overflow-hidden rounded-xl border border-hairline bg-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <span>Loading customer reviews...</span>
          </div>
        ) : reviewsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <MessageSquare className="mb-3 h-12 w-12 opacity-30" />
            <span className="text-sm font-semibold text-foreground">
              No reviews matching criteria
            </span>
            <span className="mt-1 text-xs">Try resetting your active filters</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline bg-surface text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="p-3.5 pl-5">Customer</th>
                  <th className="p-3.5">Ustad</th>
                  <th className="p-3.5">Rating</th>
                  <th className="p-3.5">Comment</th>
                  <th className="p-3.5">Booking</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {reviewsList.map((rv: any) => {
                  const bookingId = rv.booking?._id || rv.booking;
                  return (
                    <tr
                      key={rv._id}
                      onClick={() => setSelectedReview(rv)}
                      className="cursor-pointer text-sm transition hover:bg-surface/60"
                    >
                      <td className="p-3.5 pl-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={rv.customer?.profileImage}
                            name={rv.customer?.fullName || "Customer"}
                            size={30}
                          />
                          {rv.customer?._id ? (
                            <Link
                              to="/users/$id"
                              params={{ id: String(rv.customer._id) }}
                              className="font-semibold text-foreground hover:text-primary hover:underline"
                            >
                              {rv.customer.fullName || "Customer"}
                            </Link>
                          ) : (
                            <span className="font-semibold text-foreground">
                              {rv.customer?.fullName || "Anonymous"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={rv.worker?.profileImage}
                            name={rv.worker?.fullName || "Ustad"}
                            size={30}
                          />
                          {rv.worker?._id ? (
                            <Link
                              to="/workers/$id"
                              params={{ id: String(rv.worker._id) }}
                              className="font-semibold text-foreground hover:text-primary hover:underline"
                            >
                              {rv.worker.fullName || "Ustad"}
                            </Link>
                          ) : (
                            <span className="font-semibold text-foreground">
                              {rv.worker?.fullName || "Unknown Worker"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <RatingStars rating={rv.rating} size={12} />
                          {rv.isFlagged && <Badge variant="warning">Flagged</Badge>}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="line-clamp-1 max-w-[260px] text-xs text-muted-foreground">
                          {rv.comment || (
                            <span className="italic opacity-60">No written comment</span>
                          )}
                        </span>
                      </td>
                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        {bookingId ? (
                          <Link
                            to="/bookings/$id"
                            params={{ id: String(bookingId) }}
                            className="inline-flex items-center gap-0.5 rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary hover:underline"
                          >
                            #{shortId(String(bookingId))}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {rv.createdAt
                            ? format(new Date(rv.createdAt), "dd MMM yyyy")
                            : "N/A"}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedReview(rv)}
                            className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewToDelete(rv)}
                            className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar
          page={page}
          totalPages={reviewsData?.pagination.totalPages ?? 1}
          totalItems={reviewsData?.pagination.totalItems ?? 0}
          pageSize={10}
          visibleItems={reviewsList.length}
          onPageChange={setPage}
        />
      </div>

      {/* Review Detail Drawer */}
      <Drawer
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title="Review Details"
      >
        {selectedReview && (
          <div className="space-y-5">
            <div className="flex flex-col items-center justify-center rounded-xl border border-hairline bg-surface p-5 text-center">
              <span className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Rating Given
              </span>
              <span className="mb-2 font-mono text-4xl font-extrabold text-foreground">
                {selectedReview.rating}.0
              </span>
              <RatingStars rating={selectedReview.rating} size={18} />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Customer Feedback
              </h4>
              <p className="rounded-xl border border-hairline bg-surface p-4 text-sm italic leading-relaxed text-foreground">
                "{selectedReview.comment || "No written comment was provided."}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-hairline bg-surface p-3">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Review Date
                </span>
                <span className="mt-1 block font-mono text-xs font-semibold text-foreground">
                  {selectedReview.createdAt
                    ? format(new Date(selectedReview.createdAt), "dd MMM yyyy, hh:mm a")
                    : "N/A"}
                </span>
              </div>
              <div className="rounded-xl border border-hairline bg-surface p-3">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Linked Booking
                </span>
                {selectedReview.booking?._id || selectedReview.booking ? (
                  <Link
                    to="/bookings/$id"
                    params={{
                      id: String(selectedReview.booking?._id || selectedReview.booking),
                    }}
                    className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    #{shortId(String(selectedReview.booking?._id || selectedReview.booking))}{" "}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="mt-1 block text-xs text-muted-foreground">N/A</span>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-hairline pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Parties Involved
              </h4>

              <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedReview.customer?.profileImage}
                    name={selectedReview.customer?.fullName || "Customer"}
                    size={36}
                  />
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                      Customer
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {selectedReview.customer?.fullName || "Anonymous"}
                    </span>
                  </div>
                </div>
                {selectedReview.customer?._id && (
                  <Link
                    to="/users/$id"
                    params={{ id: String(selectedReview.customer._id) }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Profile <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface p-3.5">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedReview.worker?.profileImage}
                    name={selectedReview.worker?.fullName || "Worker"}
                    size={36}
                  />
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-muted-foreground">
                      Ustad
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {selectedReview.worker?.fullName || "Unknown Worker"}
                    </span>
                  </div>
                </div>
                {selectedReview.worker?._id && (
                  <Link
                    to="/workers/$id"
                    params={{ id: String(selectedReview.worker._id) }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Profile <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-hairline pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Moderation Controls
              </h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleFlagReview(selectedReview._id)}
                  className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition ${
                    selectedReview.isFlagged
                      ? "border-hairline bg-surface text-muted-foreground hover:text-foreground"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                  }`}
                  disabled={flagMutation.isPending}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {flagMutation.isPending
                    ? "Updating..."
                    : selectedReview.isFlagged
                    ? "Remove Flag"
                    : "Flag as Inappropriate"}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewToDelete(selectedReview)}
                  disabled={deleteMutation.isPending}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-xs font-bold text-destructive transition hover:bg-destructive/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Review
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!reviewToDelete}
        onOpenChange={(open) => !open && setReviewToDelete(null)}
        title="Delete customer review?"
        description="This review will be permanently removed and the Ustad's average rating will be recalculated."
        confirmLabel="Delete Review"
        tone="danger"
        onConfirm={async () => {
          if (!reviewToDelete) return;
          await deleteMutation.mutateAsync(reviewToDelete._id);
          toast.success("Review deleted successfully");
          if (selectedReview?._id === reviewToDelete._id) {
            setSelectedReview(null);
          }
          setReviewToDelete(null);
        }}
      />
    </div>
  );
}
