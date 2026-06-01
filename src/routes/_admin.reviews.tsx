import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2, Search, Calendar, Star, Filter, Eye, Tag, Sparkles, AlertTriangle, MessageSquare } from "lucide-react";
import { useReviews, useDeleteReview, useCategories, useToggleFlagReview } from "@/lib/api-hooks";
import { RatingStars, Avatar, Badge } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Drawer";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/reviews")({ component: ReviewsPage });

function ReviewsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // "today", "week", "month", ""

  // Drawer state
  const [selectedReview, setSelectedReview] = useState<any | null>(null);

  // Queries & Mutations
  const { data: reviewsData, isLoading } = useReviews({ limit: 200 }); // fetch a good number of reviews for full list management
  const { data: categories = [] } = useCategories();
  const deleteMutation = useDeleteReview();
  const flagMutation = useToggleFlagReview();

  const reviewsList = (reviewsData as any) || [];

  // Delete handler
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Review deleted successfully");
        if (selectedReview?._id === id) {
          setSelectedReview(null);
        }
      } catch (err) {
        toast.error("Failed to delete review");
      }
    }
  };

  // Real flag handler wired to backend API
  const handleFlagReview = async (id: string) => {
    const review = filteredReviews.find((r: any) => r._id === id);
    const isCurrentlyFlagged = review?.isFlagged || selectedReview?.isFlagged;
    const reason = isCurrentlyFlagged ? "Unflagged by Admin" : "Flagged by Admin";
    try {
      await flagMutation.mutateAsync({ id, reason });
      if (selectedReview && selectedReview._id === id) {
        setSelectedReview((prev: any) => ({ ...prev, isFlagged: !prev.isFlagged }));
      }
    } catch (err) {
      // Toast error is handled in mutation
    }
  };

  // In-memory calculations for stats
  const stats = useMemo(() => {
    const total = reviewsList.length;
    if (total === 0) return { total: 0, average: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

    const sum = reviewsList.reduce((acc: number, r: any) => acc + r.rating, 0);
    const average = Math.round((sum / total) * 10) / 10;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as any;
    reviewsList.forEach((r: any) => {
      const rounded = Math.round(r.rating);
      if (rounded >= 1 && rounded <= 5) {
        distribution[rounded]++;
      }
    });

    return { total, average, distribution };
  }, [reviewsList]);

  // Filters logic
  const filteredReviews = useMemo(() => {
    return reviewsList.filter((rv: any) => {
      // 1. Search Query (matches Customer Name, Worker Name, or Comment)
      const matchesSearch =
        !searchQuery ||
        `${rv.customer?.fullName || ""} ${rv.worker?.fullName || ""} ${rv.comment || ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // 2. Rating Filter
      const matchesRating = !selectedRating || Math.round(rv.rating) === +selectedRating;

      // 3. Category Filter (worker's category)
      const matchesCategory =
        !selectedCategory ||
        (rv.worker?.category &&
          String(rv.worker.category).toLowerCase() === selectedCategory.toLowerCase());

      // 4. Date Filter
      let matchesDate = true;
      if (dateFilter && rv.createdAt) {
        const reviewDate = new Date(rv.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - reviewDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (dateFilter === "today") {
          matchesDate = diffDays <= 1;
        } else if (dateFilter === "week") {
          matchesDate = diffDays <= 7;
        } else if (dateFilter === "month") {
          matchesDate = diffDays <= 30;
        }
      }

      return matchesSearch && matchesRating && matchesCategory && matchesDate;
    });
  }, [reviewsList, searchQuery, selectedRating, selectedCategory, dateFilter]);

  return (
    <div className="space-y-6">
      {/* 🚀 Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Customer Reviews
        </h2>
        <p className="text-sm text-dim mt-1">
          Monitor service feedback, ratings, and moderate customer reviews.
        </p>
      </div>

      {/* 📊 Rating Distribution & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Average Stats Card */}
        <div className="md:col-span-4 bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col items-center justify-center text-center">
          <div className="text-sm text-dim font-medium mb-1">Average Platform Rating</div>
          <div className="text-5xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
            {stats.average}
            <span className="text-sm text-dim font-normal">/ 5.0</span>
          </div>
          <div className="mt-2.5">
            <RatingStars rating={stats.average} size={18} />
          </div>
          <div className="text-xs text-dim mt-3 font-semibold">
            Based on {stats.total} total reviews
          </div>
        </div>

        {/* Rating Bars Card */}
        <div className="md:col-span-8 bg-card border border-border rounded-2xl p-5 shadow-card space-y-2.5">
          <div className="text-xs font-semibold text-dim uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Rating Distribution</span>
          </div>

          {[5, 4, 3, 2, 1].map((stars) => {
            const count = stats.distribution[stars] || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <button
                key={stars}
                onClick={() => setSelectedRating(selectedRating === String(stars) ? "" : String(stars))}
                className={`w-full flex items-center gap-3 group text-left p-1 rounded-lg transition-colors hover:bg-surface-light/20 ${
                  selectedRating === String(stars) ? "bg-surface-light/40" : ""
                }`}
              >
                <span className="text-xs font-semibold w-10 text-white flex items-center gap-1">
                  {stars} <Star className="w-3 h-3 fill-gold text-gold" />
                </span>
                <div className="flex-1 h-2 rounded-full bg-input overflow-hidden border border-border/30">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-dim w-12 text-right group-hover:text-white transition-colors">
                  {count} ({Math.round(pct)}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 🔍 Filters & Search */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-dim" />
          <input
            type="text"
            placeholder="Search by worker, customer or comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-input border border-border focus:border-primary/50 text-sm outline-none transition"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c._id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Rating Dropdown */}
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50"
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n} Stars
              </option>
            ))}
          </select>

          {/* Date Dropdown */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="p-2 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary/50"
          >
            <option value="">All Time</option>
            <option value="today">Past 24 Hours</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </select>
        </div>
      </div>

      {/* 📋 Reviews List Table */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-dim">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <span>Loading reviews database...</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-dim text-center">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-sm font-semibold">No reviews matching criteria</span>
            <span className="text-xs opacity-75 mt-1">Try resetting some filters</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-xs font-semibold text-dim uppercase tracking-wider bg-surface-light/10">
                  <th className="p-4 pl-6">Customer</th>
                  <th className="p-4">Worker</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Comment</th>
                  <th className="p-4">Booking</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredReviews.map((rv: any) => (
                  <tr
                    key={rv._id}
                    onClick={() => setSelectedReview(rv)}
                    className="hover:bg-surface-light/10 transition cursor-pointer group text-sm"
                  >
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={rv.customer?.profileImage}
                          name={rv.customer?.fullName || "Customer"}
                          size={32}
                        />
                        <div className="font-semibold">{rv.customer?.fullName || "Anonymous"}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={rv.worker?.profileImage}
                          name={rv.worker?.fullName || "Worker"}
                          size={32}
                        />
                        <div className="font-semibold text-accent">{rv.worker?.fullName || "Unknown Worker"}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <RatingStars rating={rv.rating} size={12} />
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">
                        {rv.comment || <span className="italic text-dim/60">No comment written</span>}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        {rv.booking?._id?.slice(-6) || "N/A"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-dim">
                        {rv.createdAt ? format(new Date(rv.createdAt), "dd MMM yyyy") : "N/A"}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedReview(rv)}
                          className="p-2 rounded-lg hover:bg-surface-light/40 text-dim hover:text-white transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rv._id)}
                          className="p-2 rounded-lg hover:bg-destructive/15 text-destructive transition"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔍 Detail Drawer */}
      <Drawer
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title="Review Details"
      >
        {selectedReview && (
          <div className="space-y-6">
            {/* Rating Section */}
            <div className="flex flex-col items-center justify-center p-6 bg-surface-light/20 border border-border rounded-2xl text-center">
              <span className="text-xs text-dim font-medium uppercase tracking-wider mb-1">
                Score Given
              </span>
              <span className="text-4xl font-extrabold text-white mb-2">{selectedReview.rating}.0</span>
              <RatingStars rating={selectedReview.rating} size={18} />
            </div>

            {/* Comment Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-dim uppercase tracking-wider">Comment</h4>
              <p className="p-4 bg-input border border-border rounded-xl text-sm text-slate-100 leading-relaxed italic">
                "{selectedReview.comment || "No comment was provided by the user."}"
              </p>
            </div>

            {/* Date and Booking Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-light/10 border border-border/60 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[10px] text-dim uppercase font-semibold">Review Date</span>
                <span className="text-xs font-bold text-white mt-1">
                  {selectedReview.createdAt ? format(new Date(selectedReview.createdAt), "dd MMM yyyy hh:mm a") : "N/A"}
                </span>
              </div>
              <div className="bg-surface-light/10 border border-border/60 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[10px] text-dim uppercase font-semibold">Booking ID</span>
                <span className="text-xs font-mono font-bold text-primary mt-1">
                  {selectedReview.booking?._id || "N/A"}
                </span>
              </div>
            </div>

            <hr className="border-border" />

            {/* Parties Involved */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-dim uppercase tracking-wider">Parties Involved</h4>

              {/* Customer */}
              <div className="flex items-center justify-between p-3.5 bg-surface-light/15 border border-border rounded-xl">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedReview.customer?.profileImage}
                    name={selectedReview.customer?.fullName || "Customer"}
                    size={38}
                  />
                  <div>
                    <span className="text-[10px] text-dim uppercase font-semibold block leading-none mb-1">
                      Customer
                    </span>
                    <span className="text-sm font-bold text-white">
                      {selectedReview.customer?.fullName || "Anonymous"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-dim font-medium block">
                    {selectedReview.customer?.phone || "No phone"}
                  </span>
                </div>
              </div>

              {/* Worker */}
              <div className="flex items-center justify-between p-3.5 bg-surface-light/15 border border-border rounded-xl">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedReview.worker?.profileImage}
                    name={selectedReview.worker?.fullName || "Worker"}
                    size={38}
                  />
                  <div>
                    <span className="text-[10px] text-dim uppercase font-semibold block leading-none mb-1">
                      Worker (Service Provider)
                    </span>
                    <span className="text-sm font-bold text-accent">
                      {selectedReview.worker?.fullName || "Unknown Worker"}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-xs text-dim font-medium block">
                    {selectedReview.worker?.phone || "No phone"}
                  </span>
                  {selectedReview.worker?._id && (
                    <Link
                      to="/workers/$id"
                      params={{ id: selectedReview.worker._id }}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      View Profile
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-border" />

            {/* Moderation Actions */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-dim uppercase tracking-wider">Moderation Controls</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFlagReview(selectedReview._id)}
                  className={`btn-press flex-1 h-11 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition border ${
                    selectedReview.isFlagged
                      ? "bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border-slate-500/30"
                      : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }`}
                  disabled={flagMutation.isPending}
                >
                  <AlertTriangle className="w-4 h-4" />
                  {flagMutation.isPending
                    ? "Updating..."
                    : selectedReview.isFlagged
                    ? "Unflag Review"
                    : "Flag / Inspect"}
                </button>
                <button
                  onClick={() => handleDelete(selectedReview._id)}
                  className="btn-press flex-1 h-11 rounded-xl bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/30 font-bold flex items-center justify-center gap-2 text-xs"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
