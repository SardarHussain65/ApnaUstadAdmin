import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Info,
  Landmark,
  Maximize2,
  Percent,
  RefreshCw,
  RotateCw,
  Save,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { format } from "date-fns";
import { toast } from "sonner";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge, Button, FormField, Input } from "@/components/admin/ui";
import { Drawer, Modal, ModalBody, ModalFooter } from "@/components/admin/Drawer";
import { downloadCsv } from "@/lib/csv";
import { shortId } from "@/lib/format";
import {
  useAdminAdjustWallet,
  useAdminRechargeWallet,
  useApproveWalletTopUp,
  useRejectWalletTopUp,
  useUpdateWalletPaymentMethodSettings,
  useUpdateWalletSettings,
  useWalletPaymentMethodSettings,
  useWalletSettings,
  useWalletSummary,
  useWalletTopUpSummary,
  useWalletTopUpsPage,
  useWorkerWalletDetails,
  useWorkerWalletsPage,
  type WalletPaymentMethodInput,
  type WalletPaymentMethodSetting,
  type WalletSettings,
  type WalletTopUpRequest,
  type WalletTransaction,
} from "@/lib/api-hooks";

export const Route = createFileRoute("/_admin/wallets")({
  component: WalletsPage,
});

const fmtPKR = (amount: number) => `Rs. ${Number(amount || 0).toLocaleString("en-PK")}`;

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-gold/12 text-gold border-gold/25",
  approved: "bg-success/12 text-success border-success/25",
  rejected: "bg-destructive/12 text-destructive border-destructive/25",
  eligible: "bg-success/12 text-success border-success/25",
  blocked: "bg-destructive/12 text-destructive border-destructive/25",
};

const METHOD_LABEL: Record<string, string> = {
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

function WalletsPage() {
  const [q, setQ] = useState("");
  const [balanceStatus, setBalanceStatus] = useState<any>("");
  const [topUpStatus, setTopUpStatus] = useState("pending");
  const [method, setMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [topUpPage, setTopUpPage] = useState(1);
  const [walletPage, setWalletPage] = useState(1);
  const deferredQ = useDeferredValue(q);
  const [selectedTopUp, setSelectedTopUp] = useState<WalletTopUpRequest | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [activeWallet, setActiveWallet] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjustType, setAdjustType] = useState<"refund" | "adjustment">("adjustment");
  const [workspace, setWorkspace] = useState<"topups" | "balances" | "configuration">("topups");

  useEffect(() => { setTopUpPage(1); }, [topUpStatus, method, dateFrom, dateTo, deferredQ]);
  useEffect(() => { setWalletPage(1); }, [balanceStatus, deferredQ]);

  const topUpFilters = { page: topUpPage, status: topUpStatus, method, search: deferredQ, dateFrom, dateTo, limit: 8 };
  const { data: walletSummary } = useWalletSummary();
  const { data: topUpSummary } = useWalletTopUpSummary({ method, search: deferredQ, dateFrom, dateTo });
  const { data: topUpData, isLoading: isTopUpsLoading } = useWalletTopUpsPage(topUpFilters);
  const { data: walletData, isLoading: isWalletsLoading } = useWorkerWalletsPage({ page: walletPage, search: deferredQ, balanceStatus, limit: 10 });
  const approveMutation = useApproveWalletTopUp();
  const rejectMutation = useRejectWalletTopUp();
  const adjustMutation = useAdminAdjustWallet();
  const rechargeMutation = useAdminRechargeWallet();
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeDescription, setRechargeDescription] = useState("");

  const topUps = topUpData?.items || [];
  const wallets = walletData?.items || [];

  const flatTopUps = useMemo(() => topUps.map((request: WalletTopUpRequest) => ({
    requestId: request.requestId,
    worker: request.worker?.fullName || "",
    phone: request.worker?.phone || "",
    amount: request.amount,
    method: METHOD_LABEL[request.method] || request.method,
    status: request.status,
    createdAt: request.createdAt,
    adminNotes: request.adminNotes || "",
    rejectionReason: request.rejectionReason || "",
  })), [topUps]);

  const handleOpenRecharge = (wallet: any, e: MouseEvent) => {
    e.stopPropagation();
    setActiveWallet(wallet);
    setRechargeAmount("");
    setRechargeDescription("");
    setRechargeModalOpen(true);
  };

  const handleConfirmRecharge = () => {
    const parsedAmount = parseFloat(rechargeAmount);
    if (!activeWallet?.worker?._id || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid recharge amount");
      return;
    }
    rechargeMutation.mutate(
      {
        workerId: activeWallet.worker._id,
        amount: parsedAmount,
        description: rechargeDescription.trim() || "Manual wallet recharge by admin",
      },
      {
        onSuccess: () => {
          setRechargeModalOpen(false);
          setActiveWallet(null);
        },
      }
    );
  };

  const handleOpenAdjust = (wallet: any, e: MouseEvent) => {
    e.stopPropagation();
    setActiveWallet(wallet);
    setAdjustAmount("");
    setAdjustDescription("");
    setAdjustType("adjustment");
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjust = () => {
    const parsedAmount = parseFloat(adjustAmount);
    if (isNaN(parsedAmount) || parsedAmount === 0) {
      toast.error("Please enter a non-zero adjustment amount");
      return;
    }
    if (!adjustDescription.trim()) {
      toast.error("Please enter an adjustment reason");
      return;
    }

    adjustMutation.mutate({
      workerId: activeWallet.worker._id,
      amount: parsedAmount,
      type: adjustType,
      description: adjustDescription,
    }, {
      onSuccess: () => {
        setAdjustModalOpen(false);
        setActiveWallet(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Metric title="Available Wallets" value={fmtPKR(walletSummary?.totalAvailableBalance ?? walletSummary?.totalBalance ?? 0)} helper={`${fmtPKR(walletSummary?.totalReservedBalance || 0)} held for active jobs`} icon={Wallet} tone="cyan" />
        <Metric title="Pending Top-Ups" value={fmtPKR(walletSummary?.pendingTopUpAmount || 0)} helper={`${walletSummary?.pendingTopUpCount || 0} requests`} icon={AlertTriangle} tone="amber" />
        <Metric title="Commission Collected" value={fmtPKR(walletSummary?.totalCommissionDeducted || 0)} icon={ArrowUpRight} tone="purple" />
        <Metric title="Low / Zero Wallets" value={`${walletSummary?.lowBalanceCount || 0} / ${walletSummary?.zeroBalanceCount || 0}`} helper={`Min ${fmtPKR(walletSummary?.minimumWalletBalance || 500)}`} icon={ShieldCheck} tone="red" />
      </div>

      <div className="app-glass flex flex-wrap gap-2 rounded-2xl p-2">
        <WorkspaceTab active={workspace === "topups"} onClick={() => setWorkspace("topups")} icon={AlertTriangle} label="Top-Up Queue" helper="Verify top-up receipts" />
        <WorkspaceTab active={workspace === "balances"} onClick={() => setWorkspace("balances")} icon={Wallet} label="Ustad Balances" helper="Check balances and top-ups" />
        <WorkspaceTab active={workspace === "configuration"} onClick={() => setWorkspace("configuration")} icon={Smartphone} label="Payment Settings" helper="Commission and deposit accounts" />
      </div>

      {workspace === "configuration" && (
        <div className="grid grid-cols-1 2xl:grid-cols-[0.9fr_1.4fr] gap-4">
          <CommissionSettingsPanel />
          <PaymentMethodSettingsPanel />
        </div>
      )}

      {workspace === "topups" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Pending: {topUpSummary?.pending?.count || 0}</Badge>
            <Badge variant="success">Approved: {topUpSummary?.approved?.count || 0}</Badge>
            <Badge variant="danger">Rejected: {topUpSummary?.rejected?.count || 0}</Badge>
            <button
              onClick={() => downloadCsv("wallet-topups", flatTopUps, [
                { key: "requestId", header: "Request ID" },
                { key: "worker", header: "Worker" },
                { key: "phone", header: "Phone" },
                { key: "amount", header: "Amount" },
                { key: "method", header: "Method" },
                { key: "status", header: "Status" },
                { key: "createdAt", header: "Created At" },
                { key: "adminNotes", header: "Admin Notes" },
                { key: "rejectionReason", header: "Rejection Reason" },
              ])}
              className="ml-auto inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-surface-light border border-sidebar-border hover:border-primary/50 text-xs font-bold transition"
            >
              <Download className="w-4 h-4" /> Export Top-Up Page
            </button>
          </div>

          <div className="toolbar-panel flex flex-wrap gap-2 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Search workers, phone, or email..." />
            <Select value={topUpStatus} onChange={setTopUpStatus} label="All Top-Ups" options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]} />
            <Select value={method} onChange={setMethod} label="All Methods" options={[
              { value: "easypaisa", label: "Easypaisa" },
              { value: "jazzcash", label: "JazzCash" },
              { value: "bank_transfer", label: "Bank Transfer" },
              { value: "other", label: "Other" },
            ]} />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 px-3 rounded-xl bg-input border border-border text-sm" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 px-3 rounded-xl bg-input border border-border text-sm" />
          </div>

          <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold">Top-Up Verification Queue</h2>
            <p className="text-xs text-muted-foreground">Review uploaded payment proofs before wallet credit is applied.</p>
          </div>
          <Badge variant={(topUpSummary?.pending?.count || 0) ? "danger" : "success"} pulse={(topUpSummary?.pending?.count || 0) > 0}>
            {topUpSummary?.pending?.count || 0} Pending
          </Badge>
        </div>

        <DataTable
          isLoading={isTopUpsLoading}
          rows={topUps}
          pageSize={8}
          pagination={{
            page: topUpPage,
            totalPages: topUpData?.pagination.totalPages ?? 1,
            totalItems: topUpData?.pagination.totalItems ?? 0,
            onPageChange: setTopUpPage,
          }}
          onRowClick={(request) => setSelectedTopUp(request as WalletTopUpRequest)}
          columns={[
            { key: "request", header: "Request", render: (request: WalletTopUpRequest) => (
              <div>
                <div className="font-mono text-xs font-bold text-primary">{request.requestId}</div>
                <div className="text-[10px] text-muted-foreground">{format(new Date(request.createdAt), "dd MMM yyyy HH:mm")}</div>
              </div>
            ) },
            { key: "worker", header: "Ustad", render: (request: WalletTopUpRequest) => (
              <div className="flex items-center gap-3">
                <Avatar src={request.worker?.profileImage} name={request.worker?.fullName || "Ustad"} />
                <div>
                  <div className="font-semibold">{request.worker?.fullName || "Unknown ustad"}</div>
                  <div className="text-xs text-muted-foreground">{request.worker?.phone || "No phone"}</div>
                </div>
              </div>
            ) },
            { key: "method", header: "Method", render: (request: WalletTopUpRequest) => <span className="text-xs font-bold">{METHOD_LABEL[request.method] || request.method}</span> },
            { key: "amount", header: "Amount", render: (request: WalletTopUpRequest) => <span className="font-extrabold text-success">{fmtPKR(request.amount)}</span> },
            { key: "status", header: "Status", render: (request: WalletTopUpRequest) => <StatusPill status={request.status} /> },
            { key: "proof", header: "Proof", render: (request: WalletTopUpRequest) => (
              <button onClick={(e) => { e.stopPropagation(); setSelectedTopUp(request); }} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                <Eye className="w-3.5 h-3.5" /> View
              </button>
            ) },
          ]}
        />
          </section>
        </>
      )}

      {workspace === "balances" && (
        <>
          <div className="toolbar-panel flex flex-wrap gap-2 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Search ustads, phone, or email..." />
            <Select value={balanceStatus} onChange={setBalanceStatus} label="All Balances" options={[
              { value: "sufficient", label: "Sufficient" },
              { value: "low", label: "Low" },
              { value: "zero", label: "Zero / Negative" },
            ]} />
          </div>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-extrabold">Ustad Balances</h2>
              <p className="text-xs text-muted-foreground">Monitor ustad wallet balances, app fees, and balance adjustments.</p>
            </div>

            <DataTable
          isLoading={isWalletsLoading}
          rows={wallets}
          pageSize={10}
          pagination={{
            page: walletPage,
            totalPages: walletData?.pagination.totalPages ?? 1,
            totalItems: walletData?.pagination.totalItems ?? 0,
            onPageChange: setWalletPage,
          }}
          onRowClick={(wallet) => setSelectedWorkerId(wallet.worker._id)}
          columns={[
            { key: "worker", header: "Ustad", render: (wallet) => (
              <div className="flex items-center gap-3">
                <Avatar src={wallet.worker.profileImage} name={wallet.worker.fullName} />
                <div>
                  <div className="font-semibold">{wallet.worker.fullName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{shortId(wallet.worker._id)}</div>
                </div>
              </div>
            ) },
            { key: "phone", header: "Phone", render: (wallet) => <span className="font-mono text-xs">{wallet.worker.phone}</span> },
            { key: "balance", header: "Available", render: (wallet) => <span className={`font-extrabold ${(wallet.availableBalance ?? wallet.balance) < (walletSummary?.minimumWalletBalance || 500) ? "text-destructive" : "text-success"}`}>{fmtPKR(wallet.availableBalance ?? wallet.balance)}</span> },
            { key: "held", header: "Reserved Fee", render: (wallet) => <span className="text-xs font-semibold text-gold">{fmtPKR(wallet.reservedBalance || 0)}</span> },
            { key: "recharged", header: "Approved Top-Ups", render: (wallet) => <span className="text-xs font-semibold text-muted-foreground">{fmtPKR(wallet.totalRecharged)}</span> },
            { key: "commission", header: "App Fee", render: (wallet) => <span className="text-xs font-semibold text-muted-foreground">{fmtPKR(wallet.totalCommissionDeducted)}</span> },
            { key: "status", header: "Status", render: (wallet) => (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${(wallet.availableBalance ?? wallet.balance) < (walletSummary?.minimumWalletBalance || 500) ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                {(wallet.availableBalance ?? wallet.balance) < (walletSummary?.minimumWalletBalance || 500) ? "Low Balance" : "Active"}
              </span>
            ) },
            { key: "actions", header: "", render: (wallet) => (
              <div className="flex justify-end gap-1">
                <button onClick={(e) => handleOpenRecharge(wallet, e)} className="p-2 rounded-lg hover:bg-success/15 text-success transition" title="Manual top-up">
                  <Banknote className="w-4 h-4" />
                </button>
                <button onClick={(e) => handleOpenAdjust(wallet, e)} className="p-2 rounded-lg hover:bg-primary/15 text-primary transition" title="Manual correction">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            ) },
          ]}
            />
          </section>
        </>
      )}

      <Drawer open={!!selectedTopUp} onClose={() => setSelectedTopUp(null)} title="Top-Up Receipt Verification" width="max-w-2xl">
        {selectedTopUp && (
          <TopUpDetail
            request={selectedTopUp}
            onApprove={(adminNotes) => approveMutation.mutate({ id: selectedTopUp._id, adminNotes }, { onSuccess: () => setSelectedTopUp(null) })}
            onReject={(rejectionReason, adminNotes) => rejectMutation.mutate({ id: selectedTopUp._id, rejectionReason, adminNotes }, { onSuccess: () => setSelectedTopUp(null) })}
            isApproving={approveMutation.isPending}
            isRejecting={rejectMutation.isPending}
          />
        )}
      </Drawer>

      <Drawer open={!!selectedWorkerId} onClose={() => setSelectedWorkerId(null)} title="Worker Wallet Details">
        {selectedWorkerId && <WorkerWalletDetail workerId={selectedWorkerId} />}
      </Drawer>

      <Modal
        open={adjustModalOpen && !!activeWallet}
        onClose={() => { setAdjustModalOpen(false); setActiveWallet(null); }}
        title="Manual wallet correction"
        description="Use only for admin corrections, refunds, or balance fixes."
        variant="warning"
        footer={
          activeWallet ? (
            <ModalFooter>
              <Button variant="ghost" onClick={() => { setAdjustModalOpen(false); setActiveWallet(null); }}>Cancel</Button>
              <Button variant="primary" loading={adjustMutation.isPending} onClick={handleConfirmAdjust}>
                Apply correction
              </Button>
            </ModalFooter>
          ) : undefined
        }
      >
        {activeWallet && (
          <ModalBody>
            <p className="text-sm text-muted-foreground">
              Adjusting wallet for <strong className="text-white">{activeWallet.worker.fullName}</strong>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={adjustType === "adjustment" ? "primary" : "outline"} onClick={() => setAdjustType("adjustment")}>Correction</Button>
              <Button type="button" variant={adjustType === "refund" ? "success" : "outline"} onClick={() => setAdjustType("refund")}>Refund</Button>
            </div>
            <FormField label="Amount" hint="Use negative values to deduct balance.">
              <Input type="number" placeholder="e.g. -500 or 250" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} />
            </FormField>
            <FormField label="Reason" hint="Required for audit trail.">
              <Input type="text" placeholder="Why is this correction needed?" value={adjustDescription} onChange={(e) => setAdjustDescription(e.target.value)} />
            </FormField>
          </ModalBody>
        )}
      </Modal>

      <Modal
        open={rechargeModalOpen && !!activeWallet}
        onClose={() => { setRechargeModalOpen(false); setActiveWallet(null); }}
        title="Manual wallet recharge"
        description="Credit wallet balance after verifying offline payment."
        variant="success"
        footer={
          activeWallet ? (
            <ModalFooter>
              <Button variant="ghost" onClick={() => { setRechargeModalOpen(false); setActiveWallet(null); }}>Cancel</Button>
              <Button variant="success" loading={rechargeMutation.isPending} onClick={handleConfirmRecharge}>
                Recharge wallet
              </Button>
            </ModalFooter>
          ) : undefined
        }
      >
        {activeWallet && (
          <ModalBody>
            <p className="text-sm text-muted-foreground">
              Crediting wallet for <strong className="text-white">{activeWallet.worker?.fullName}</strong>
            </p>
            <FormField label="Amount">
              <Input type="number" placeholder="e.g. 1000" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} />
            </FormField>
            <FormField label="Description">
              <Input type="text" placeholder="Optional note for ledger" value={rechargeDescription} onChange={(e) => setRechargeDescription(e.target.value)} />
            </FormField>
          </ModalBody>
        )}
      </Modal>
    </div>
  );
}

function Metric({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper?: string; icon: any; tone: "cyan" | "amber" | "purple" | "red" }) {
  const toneClass = {
    cyan: "text-primary bg-primary/10 border-primary/20",
    amber: "text-gold bg-gold/10 border-gold/20",
    purple: "text-secondary bg-secondary/10 border-secondary/20",
    red: "text-destructive bg-destructive/10 border-destructive/20",
  }[tone];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{title}</div>
          <div className="mt-2 text-xl font-extrabold">{value}</div>
          {helper && <div className="mt-1 text-xs text-muted-foreground">{helper}</div>}
        </div>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function WorkspaceTab({ active, onClick, icon: Icon, label, helper }: { active: boolean; onClick: () => void; icon: any; label: string; helper: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[210px] flex-1 items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
        active
          ? "border-primary/35 bg-primary/10 shadow-[0_0_18px_rgba(0,245,255,0.08)]"
          : "border-transparent bg-white/[0.025] hover:border-border hover:bg-surface-light/50"
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${active ? "border-primary/25 bg-primary/15 text-primary" : "border-border bg-surface-light text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className={`block text-xs font-extrabold ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{helper}</span>
      </span>
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${STATUS_STYLE[status] || STATUS_STYLE.pending}`}>
      {status}
    </span>
  );
}

function CommissionSettingsPanel() {
  const { data: settings, isLoading } = useWalletSettings();
  const updateMutation = useUpdateWalletSettings();
  const [form, setForm] = useState<WalletSettings>({
    platformFeePercentage: 10,
    minimumWalletBalance: 500,
    additionalCategoryMonthlyFee: 500,
    commissionEnabled: true,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      platformFeePercentage: settings.platformFeePercentage,
      minimumWalletBalance: settings.minimumWalletBalance,
      additionalCategoryMonthlyFee: settings.additionalCategoryMonthlyFee ?? 500,
      commissionEnabled: settings.commissionEnabled !== false,
    });
  }, [settings]);

  const previewJobAmount = 5000;
  const previewCommission = form.commissionEnabled
    ? Math.round((previewJobAmount * (Number(form.platformFeePercentage || 0) / 100)) * 100) / 100
    : 0;
  const previewRequired = Math.max(Number(form.minimumWalletBalance || 0), previewCommission);

  const handleSave = () => {
    if (Number(form.platformFeePercentage) < 0 || Number(form.platformFeePercentage) > 100) {
      toast.error("Commission percentage must be between 0 and 100");
      return;
    }
    if (Number(form.minimumWalletBalance) < 0) {
      toast.error("Minimum wallet balance cannot be negative");
      return;
    }
    if (Number(form.additionalCategoryMonthlyFee) < 0) {
      toast.error("Extra category monthly fee cannot be negative");
      return;
    }

    updateMutation.mutate({
      platformFeePercentage: Number(form.platformFeePercentage),
      minimumWalletBalance: Number(form.minimumWalletBalance),
      additionalCategoryMonthlyFee: Number(form.additionalCategoryMonthlyFee),
      commissionEnabled: form.commissionEnabled,
    });
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Commission Rules</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Controls new job platform fees and the minimum wallet balance workers need before bidding or accepting work.
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center">
          <Percent className="w-5 h-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading commission rules...</div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-light border border-sidebar-border px-3 py-3">
            <div>
              <div className="text-sm font-extrabold">Commission deduction</div>
              <div className="text-xs text-muted-foreground">Applies to new cash jobs when payment is confirmed paid.</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.commissionEnabled}
              onClick={() => setForm((current) => ({ ...current, commissionEnabled: !current.commissionEnabled }))}
              className={`w-12 h-7 rounded-full p-1 transition ${form.commissionEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`block w-5 h-5 rounded-full bg-background transition ${form.commissionEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Commission %</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.platformFeePercentage}
                onChange={(e) => setForm((current) => ({ ...current, platformFeePercentage: Number(e.target.value) }))}
                className="w-full h-11 bg-input border border-border rounded-xl px-3 text-sm font-extrabold focus:outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Minimum Wallet Balance</span>
              <input
                type="number"
                min={0}
                step={50}
                value={form.minimumWalletBalance}
                onChange={(e) => setForm((current) => ({ ...current, minimumWalletBalance: Number(e.target.value) }))}
                className="w-full h-11 bg-input border border-border rounded-xl px-3 text-sm font-extrabold focus:outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Extra Category Monthly Fee</span>
              <input
                type="number"
                min={0}
                step={50}
                value={form.additionalCategoryMonthlyFee}
                onChange={(e) => setForm((current) => ({ ...current, additionalCategoryMonthlyFee: Number(e.target.value) }))}
                className="w-full h-11 bg-input border border-border rounded-xl px-3 text-sm font-extrabold focus:outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoBox label="Rs. 5,000 job commission" value={fmtPKR(previewCommission)} accent={form.commissionEnabled ? "text-gold" : "text-muted-foreground"} />
            <InfoBox label="Required wallet balance" value={fmtPKR(previewRequired)} accent="text-primary" />
            <InfoBox label="Extra category charge" value={fmtPKR(form.additionalCategoryMonthlyFee || 0)} accent="text-accent" />
          </div>

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full h-11 rounded-xl gradient-purple text-foreground font-extrabold glow-purple flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {updateMutation.isPending ? "Saving Rules..." : "Save Commission Rules"}
          </button>
        </>
      )}
    </section>
  );
}

const PAYMENT_METHOD_ICONS: Record<string, any> = {
  easypaisa: Smartphone,
  jazzcash: Smartphone,
  bank_transfer: Landmark,
  other: Banknote,
};

const isMethodConfigured = (method: WalletPaymentMethodInput | WalletPaymentMethodSetting) => {
  if (method.method === "bank_transfer") {
    return Boolean(method.accountNumber || method.iban);
  }

  if (method.method === "other") {
    return Boolean(method.accountNumber || method.instructions);
  }

  return Boolean(method.accountNumber);
};

function PaymentMethodSettingsPanel() {
  const { data: methods = [], isLoading } = useWalletPaymentMethodSettings();
  const updateMutation = useUpdateWalletPaymentMethodSettings();
  const [rows, setRows] = useState<WalletPaymentMethodInput[]>([]);

  useEffect(() => {
    if (!methods.length) return;

    setRows(methods.map((method, index) => ({
      method: method.method,
      label: method.label || METHOD_LABEL[method.method] || method.method,
      accountTitle: method.accountTitle || "",
      accountNumber: method.accountNumber || "",
      bankName: method.bankName || "",
      iban: method.iban || "",
      instructions: method.instructions || "",
      enabled: method.enabled !== false,
      sortOrder: method.sortOrder ?? index,
    })));
  }, [methods]);

  const updateRow = <K extends keyof WalletPaymentMethodInput>(
    methodKey: WalletPaymentMethodInput["method"],
    key: K,
    value: WalletPaymentMethodInput[K]
  ) => {
    setRows((current) => current.map((row) => (
      row.method === methodKey ? { ...row, [key]: value } : row
    )));
  };

  const handleSave = () => {
    updateMutation.mutate({
      methods: rows.map((row, index) => ({
        ...row,
        label: row.label.trim() || METHOD_LABEL[row.method] || row.method,
        accountTitle: row.accountTitle.trim(),
        accountNumber: row.accountNumber.trim(),
        bankName: row.bankName?.trim() || "",
        iban: row.iban?.trim().toUpperCase() || "",
        instructions: row.instructions?.trim() || "",
        sortOrder: index,
      })),
    });
  };

  const configuredCount = rows.filter((row) => row.enabled && isMethodConfigured(row)).length;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Worker Top-Up Payment Details</h2>
          <p className="text-xs text-muted-foreground mt-1">
            These details are shown in the worker app when a worker selects a wallet top-up payment method.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={configuredCount ? "success" : "danger"}>{configuredCount} Ready</Badge>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading || !rows.length}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl gradient-purple text-foreground text-xs font-extrabold glow-purple disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {updateMutation.isPending ? "Saving..." : "Save Details"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading payment details...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          {rows.map((method) => {
            const Icon = PAYMENT_METHOD_ICONS[method.method] || Banknote;
            const ready = method.enabled && isMethodConfigured(method);
            const isBank = method.method === "bank_transfer";

            return (
              <div key={method.method} className="rounded-2xl border border-sidebar-border bg-surface/70 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold">{METHOD_LABEL[method.method] || method.label}</div>
                      <div className={`text-[10px] font-bold uppercase ${ready ? "text-success" : "text-gold"}`}>
                        {ready ? "Visible and ready" : method.enabled ? "Setup needed" : "Disabled"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={method.enabled}
                    onClick={() => updateRow(method.method, "enabled", !method.enabled)}
                    className={`w-11 h-6 rounded-full p-1 transition ${method.enabled ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-background transition ${method.enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <input
                  value={method.label}
                  onChange={(e) => updateRow(method.method, "label", e.target.value)}
                  placeholder="Display label"
                  className="w-full h-10 bg-input border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={method.accountTitle}
                  onChange={(e) => updateRow(method.method, "accountTitle", e.target.value)}
                  placeholder="Account title"
                  className="w-full h-10 bg-input border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary"
                />
                {isBank && (
                  <input
                    value={method.bankName || ""}
                    onChange={(e) => updateRow(method.method, "bankName", e.target.value)}
                    placeholder="Bank name"
                    className="w-full h-10 bg-input border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary"
                  />
                )}
                <input
                  value={method.accountNumber}
                  onChange={(e) => updateRow(method.method, "accountNumber", e.target.value)}
                  placeholder={isBank ? "Account number" : "Mobile wallet number"}
                  className="w-full h-10 bg-input border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary font-mono"
                />
                {isBank && (
                  <input
                    value={method.iban || ""}
                    onChange={(e) => updateRow(method.method, "iban", e.target.value)}
                    placeholder="IBAN"
                    className="w-full h-10 bg-input border border-border rounded-xl px-3 text-sm focus:outline-none focus:border-primary font-mono uppercase"
                  />
                )}
                <textarea
                  value={method.instructions || ""}
                  onChange={(e) => updateRow(method.method, "instructions", e.target.value)}
                  placeholder="Worker instructions"
                  className="w-full min-h-20 bg-input border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const REJECTION_PRESETS = [
  "Transaction ID not found in JazzCash/EasyPaisa/Bank portal",
  "Amount mismatch (receipt shows different PKR amount than requested)",
  "Duplicate transaction ID / receipt screenshot already claimed",
  "Receipt image is blurry, cropped, or lacks bank timestamp",
  "Payment was transferred to an outdated or incorrect company account",
];

function TopUpDetail({
  request,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  request: WalletTopUpRequest;
  onApprove: (adminNotes: string) => void;
  onReject: (reason: string, adminNotes: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Transaction ID pattern detection
  const isLikelyTid = useMemo(() => {
    const raw = request.requestId.replace(/[^0-9a-zA-Z]/g, "");
    return raw.length >= 8;
  }, [request.requestId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleConfirmReject = () => {
    const finalReason = selectedPreset || rejectionReason;
    if (!finalReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    onReject(finalReason, adminNotes);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header Card */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface-light border border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-primary text-sm font-black">{request.requestId}</span>
            <button
              type="button"
              onClick={() => handleCopy(request.requestId, "Transaction Reference")}
              className="p-1 rounded-md hover:bg-surface text-muted-foreground hover:text-white transition"
              title="Copy Reference"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Submitted {format(new Date(request.createdAt), "dd MMM yyyy HH:mm")}
          </div>
        </div>
        <StatusPill status={request.status} />
      </div>

      {/* Worker info card */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-light border border-border/80">
        <Avatar src={request.worker?.profileImage} name={request.worker?.fullName || "Worker"} size={48} />
        <div>
          <div className="font-bold text-white text-sm">{request.worker?.fullName || "Unknown worker"}</div>
          <div className="text-xs text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
            <span>{request.worker?.phone || "No phone"}</span>
            <span>·</span>
            <span>{request.worker?.category || "General"}</span>
          </div>
        </div>
      </div>

      {/* Transaction & Snapshot Grid */}
      <div className="grid grid-cols-2 gap-3">
        <InfoBox label="Requested Top-Up" value={fmtPKR(request.amount)} accent="text-success font-black text-base" />
        <InfoBox label="Payment Channel" value={METHOD_LABEL[request.method] || request.method} />
        <InfoBox
          label="Deposit Account Title"
          value={request.paymentDetailsSnapshot?.accountTitle || "Not set"}
        />
        <div className="p-3 rounded-xl bg-surface-light border border-border/60">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center justify-between">
            <span>Deposit Account / IBAN</span>
            {(request.paymentDetailsSnapshot?.accountNumber || request.paymentDetailsSnapshot?.iban) && (
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    request.paymentDetailsSnapshot?.accountNumber || request.paymentDetailsSnapshot?.iban || "",
                    "Account number"
                  )
                }
                className="text-primary hover:underline text-[10px] flex items-center gap-0.5"
              >
                <Copy className="w-2.5 h-2.5" /> Copy
              </button>
            )}
          </div>
          <div className="mt-1 text-xs font-mono font-bold text-foreground break-all">
            {request.paymentDetailsSnapshot?.accountNumber || request.paymentDetailsSnapshot?.iban || "Not recorded"}
          </div>
        </div>
      </div>

      {/* Pattern check chip */}
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface border border-border/60 text-xs">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        <span className="text-muted-foreground">Reference Verification:</span>
        <span className="font-mono text-white font-semibold">
          {isLikelyTid ? "Standard TID structure detected" : "Custom/Manual Reference"}
        </span>
      </div>

      {/* Uploaded Proof with Pan, Zoom & Rotate Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>DEPOSIT PROOF RECEIPT</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="text-primary flex items-center gap-1 hover:underline text-xs"
            >
              <RotateCw className="w-3.5 h-3.5" /> Rotate ({rotation}°)
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="text-primary flex items-center gap-1 hover:underline text-xs"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Expand
            </button>
          </div>
        </div>

        <div
          className="w-full aspect-[4/3] max-h-[380px] rounded-2xl overflow-hidden border border-border/80 bg-surface-light relative group cursor-zoom-in flex items-center justify-center shadow-inner"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={request.proofImageUrl}
            alt="Payment proof"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
            className="w-full h-full object-contain transition duration-200"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition gap-1.5">
            <Maximize2 className="w-4 h-4" /> Click to Zoom Fullscreen
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
              className="p-1.5 rounded-lg border border-border bg-surface text-xs text-muted-foreground hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-muted-foreground px-1">{zoomLevel}x</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-1.5 rounded-lg border border-border bg-surface text-xs text-muted-foreground hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href={request.proofImageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            Open in new tab <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Pending Action Controls */}
      {request.status === "pending" ? (
        <div className="space-y-4 pt-3 border-t border-border/80">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Admin Notes (Audit Trail)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Private notes (e.g. cross-checked with JazzCash portal statement)..."
              rows={2}
              className="w-full bg-input border border-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Approve button */}
          <button
            type="button"
            onClick={() => onApprove(adminNotes)}
            disabled={isApproving || isRejecting}
            className="w-full h-12 rounded-xl gradient-success text-background font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {isApproving ? "Approving & Crediting..." : `Approve & Credit ${fmtPKR(request.amount)}`}
          </button>

          {/* Rejection Presets section */}
          <div className="p-3.5 rounded-xl bg-surface border border-border/80 space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-destructive block">
              Reject Top-Up with Reason
            </label>
            <div className="space-y-1">
              {REJECTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset);
                    setRejectionReason("");
                  }}
                  className={`w-full text-left p-2 rounded-lg border text-xs transition ${
                    selectedPreset === preset
                      ? "border-destructive bg-destructive/15 text-destructive font-bold"
                      : "border-border bg-surface-light text-muted-foreground hover:text-white"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setSelectedPreset("");
              }}
              rows={2}
              placeholder="Or enter custom rejection reason sent to worker..."
              className="w-full bg-input border border-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-destructive resize-none"
            />

            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={isApproving || isRejecting || (!selectedPreset && !rejectionReason.trim())}
              className="w-full h-10 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-destructive/25 transition disabled:opacity-40"
            >
              <XCircle className="w-4 h-4" /> {isRejecting ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-surface-light border border-border/80 space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Admin Decision Log</div>
          <div className="text-sm text-foreground">{request.adminNotes || "No admin notes recorded"}</div>
          {request.rejectionReason && (
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-semibold text-destructive">
              Rejection Reason: {request.rejectionReason}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Fullscreen Preview */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Payment Proof Fullscreen"
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="flex items-center gap-3 mb-3 bg-surface/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
            >
              <RotateCw className="w-4 h-4" /> Rotate ({rotation}°)
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="text-xs text-muted-foreground hover:text-white font-bold flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Close Zoom
            </button>
          </div>

          <img
            src={request.proofImageUrl}
            alt="Full Receipt"
            style={{ transform: `rotate(${rotation}deg)` }}
            className="max-w-[90vw] max-h-[85vh] rounded-2xl border border-border shadow-2xl object-contain transition duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}


function InfoBox({ label, value, accent = "text-foreground" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-3 rounded-xl bg-surface-light">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</div>
      <div className={`mt-1 text-sm font-extrabold break-words ${accent}`}>{value}</div>
    </div>
  );
}

function WorkerWalletDetail({ workerId }: { workerId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useWorkerWalletDetails(workerId, page, 10);

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Loading details...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-sm text-muted-foreground">Failed to load wallet details.</div>;
  }

  const { worker, wallet, transactions, pagination } = data;
  const availableBalance = wallet.availableBalance ?? wallet.balance;

  const TX_MAP: Record<string, { color: string; label: string; icon: any }> = {
    recharge: { color: "text-success bg-success/10 border-success/20", label: "Recharge", icon: ArrowDownLeft },
    commission_deduction: { color: "text-gold bg-gold/10 border-gold/20", label: "Commission", icon: ArrowUpRight },
    refund: { color: "text-blue-300 bg-blue-500/10 border-blue-500/20", label: "Refund", icon: RefreshCw },
    adjustment: { color: "text-primary bg-primary/10 border-primary/20", label: "Adjustment", icon: Info },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar src={worker.profileImage} name={worker.fullName} size={72} />
        <div>
          <div className="text-xl font-bold">{worker.fullName}</div>
          <div className="text-xs text-muted-foreground font-mono">{worker._id}</div>
          <div className="mt-1"><StatusPill status={availableBalance < 500 ? "blocked" : "eligible"} /></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoBox label="Available Balance" value={fmtPKR(availableBalance)} accent={availableBalance < 500 ? "text-destructive" : "text-success"} />
        <InfoBox label="Held for Active Jobs" value={fmtPKR(wallet.reservedBalance || 0)} accent="text-gold" />
        <InfoBox label="Approved Top-Ups" value={fmtPKR(wallet.totalRecharged)} />
        <InfoBox label="Commission Deducted" value={fmtPKR(wallet.totalCommissionDeducted)} />
        <InfoBox label="Last Top-Up" value={wallet.lastRechargedAt ? format(new Date(wallet.lastRechargedAt), "dd MMM yyyy HH:mm") : "Never"} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Transaction History</div>
          <button
            onClick={() => downloadCsv("wallet-transactions", transactions.map((tx: WalletTransaction) => ({
              type: tx.type,
              amount: tx.amount,
              balanceBefore: tx.balanceBefore,
              balanceAfter: tx.balanceAfter,
              description: tx.description,
              createdAt: tx.createdAt,
              performedBy: tx.performedBy.actorType,
            })), [
              { key: "type", header: "Type" },
              { key: "amount", header: "Amount" },
              { key: "balanceBefore", header: "Balance Before" },
              { key: "balanceAfter", header: "Balance After" },
              { key: "description", header: "Description" },
              { key: "createdAt", header: "Created At" },
              { key: "performedBy", header: "Performed By" },
            ])}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-light border border-sidebar-border text-xs font-bold hover:border-primary/50"
          >
            <FileText className="w-3.5 h-3.5" /> Statement CSV
          </button>
        </div>
        <div className="space-y-2">
          {transactions.map((tx: WalletTransaction) => {
            const config = TX_MAP[tx.type] || TX_MAP.adjustment;
            const Icon = config.icon;
            const isPositive = ["recharge", "refund"].includes(tx.type);

            return (
              <div key={tx._id} className="flex items-center justify-between p-3.5 rounded-xl bg-surface-light border border-sidebar-border/30">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{tx.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(tx.createdAt), "dd MMM yyyy HH:mm")} · Bal after: {fmtPKR(tx.balanceAfter)}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-extrabold ${isPositive ? "text-success" : "text-destructive"}`}>
                  {isPositive ? "+" : "-"}{fmtPKR(tx.amount)}
                </div>
              </div>
            );
          })}

          {transactions.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center bg-surface-light rounded-xl border border-dashed border-sidebar-border">
              No transactions recorded yet
            </div>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-surface-light border border-sidebar-border text-xs font-semibold disabled:opacity-50">Previous</button>
            <span className="text-xs text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1.5 rounded-lg bg-surface-light border border-sidebar-border text-xs font-semibold disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
