import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Info,
  Landmark,
  Percent,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Wallet,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DataTable, SearchInput, Select } from "@/components/admin/DataTable";
import { Avatar, Badge } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/Drawer";
import { downloadCsv } from "@/lib/csv";
import {
  useAdminAdjustWallet,
  useApproveWalletTopUp,
  useRejectWalletTopUp,
  useUpdateWalletPaymentMethodSettings,
  useUpdateWalletSettings,
  useWalletPaymentMethodSettings,
  useWalletSettings,
  useWalletSummary,
  useWalletTopUpSummary,
  useWalletTopUps,
  useWorkerWalletDetails,
  useWorkerWallets,
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
  pending: "bg-amber-500/12 text-amber-300 border-amber-500/25",
  approved: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25",
  rejected: "bg-destructive/12 text-destructive border-destructive/25",
  eligible: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25",
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
  const [selectedTopUp, setSelectedTopUp] = useState<WalletTopUpRequest | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [activeWallet, setActiveWallet] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjustType, setAdjustType] = useState<"refund" | "adjustment">("adjustment");

  const topUpFilters = { status: topUpStatus, method, search: q, dateFrom, dateTo, limit: 100 };
  const { data: walletSummary } = useWalletSummary();
  const { data: topUpSummary } = useWalletTopUpSummary({ method, search: q, dateFrom, dateTo });
  const { data: topUpData, isLoading: isTopUpsLoading } = useWalletTopUps(topUpFilters);
  const { data: walletData, isLoading: isWalletsLoading } = useWorkerWallets({ search: q, balanceStatus, limit: 100 });
  const approveMutation = useApproveWalletTopUp();
  const rejectMutation = useRejectWalletTopUp();
  const adjustMutation = useAdminAdjustWallet();

  const topUps = (topUpData as any) || [];
  const wallets = (walletData as any) || [];
  const pendingTopUps = topUps.filter((request: WalletTopUpRequest) => request.status === "pending");

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

      <div className="grid grid-cols-1 2xl:grid-cols-[0.9fr_1.4fr] gap-4">
        <CommissionSettingsPanel />
        <PaymentMethodSettingsPanel />
      </div>

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
          <Download className="w-4 h-4" /> Export Top-Ups
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
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
        <Select value={balanceStatus} onChange={setBalanceStatus} label="All Balances" options={[
          { value: "sufficient", label: "Sufficient" },
          { value: "low", label: "Low" },
          { value: "zero", label: "Zero / Negative" },
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
          <Badge variant={pendingTopUps.length ? "danger" : "success"} pulse={pendingTopUps.length > 0}>
            {pendingTopUps.length} Pending
          </Badge>
        </div>

        <DataTable
          isLoading={isTopUpsLoading}
          rows={topUps}
          pageSize={8}
          onRowClick={(request) => setSelectedTopUp(request as WalletTopUpRequest)}
          columns={[
            { key: "request", header: "Request", render: (request: WalletTopUpRequest) => (
              <div>
                <div className="font-mono text-xs font-bold text-primary">{request.requestId}</div>
                <div className="text-[10px] text-muted-foreground">{format(new Date(request.createdAt), "dd MMM yyyy HH:mm")}</div>
              </div>
            ) },
            { key: "worker", header: "Worker", render: (request: WalletTopUpRequest) => (
              <div className="flex items-center gap-3">
                <Avatar src={request.worker?.profileImage} name={request.worker?.fullName || "Worker"} />
                <div>
                  <div className="font-semibold">{request.worker?.fullName || "Unknown worker"}</div>
                  <div className="text-xs text-muted-foreground">{request.worker?.phone || "No phone"}</div>
                </div>
              </div>
            ) },
            { key: "method", header: "Method", render: (request: WalletTopUpRequest) => <span className="text-xs font-bold">{METHOD_LABEL[request.method] || request.method}</span> },
            { key: "amount", header: "Amount", render: (request: WalletTopUpRequest) => <span className="font-extrabold text-emerald-300">{fmtPKR(request.amount)}</span> },
            { key: "status", header: "Status", render: (request: WalletTopUpRequest) => <StatusPill status={request.status} /> },
            { key: "proof", header: "Proof", render: (request: WalletTopUpRequest) => (
              <button onClick={(e) => { e.stopPropagation(); setSelectedTopUp(request); }} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                <Eye className="w-3.5 h-3.5" /> View
              </button>
            ) },
          ]}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold">Worker Balances</h2>
          <p className="text-xs text-muted-foreground">Monitor wallet eligibility, commission deductions, and manual corrections.</p>
        </div>

        <DataTable
          isLoading={isWalletsLoading}
          rows={wallets}
          pageSize={10}
          onRowClick={(wallet) => setSelectedWorkerId(wallet.worker._id)}
          columns={[
            { key: "worker", header: "Worker", render: (wallet) => (
              <div className="flex items-center gap-3">
                <Avatar src={wallet.worker.profileImage} name={wallet.worker.fullName} />
                <div>
                  <div className="font-semibold">{wallet.worker.fullName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{wallet.worker._id.slice(-6)}</div>
                </div>
              </div>
            ) },
            { key: "phone", header: "Phone", render: (wallet) => <span className="font-mono text-xs">{wallet.worker.phone}</span> },
            { key: "balance", header: "Available", render: (wallet) => <span className={`font-extrabold ${(wallet.availableBalance ?? wallet.balance) < (walletSummary?.minimumWalletBalance || 500) ? "text-destructive" : "text-emerald-300"}`}>{fmtPKR(wallet.availableBalance ?? wallet.balance)}</span> },
            { key: "held", header: "Held", render: (wallet) => <span className="text-xs font-semibold text-amber-300">{fmtPKR(wallet.reservedBalance || 0)}</span> },
            { key: "recharged", header: "Approved Top-Ups", render: (wallet) => <span className="text-xs font-semibold text-muted-foreground">{fmtPKR(wallet.totalRecharged)}</span> },
            { key: "commission", header: "Commission", render: (wallet) => <span className="text-xs font-semibold text-muted-foreground">{fmtPKR(wallet.totalCommissionDeducted)}</span> },
            { key: "status", header: "Eligibility", render: (wallet) => (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${(wallet.availableBalance ?? wallet.balance) < (walletSummary?.minimumWalletBalance || 500) ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-300"}`}>
                {(wallet.availableBalance ?? wallet.balance) < (walletSummary?.minimumWalletBalance || 500) ? "Blocked" : "Eligible"}
              </span>
            ) },
            { key: "actions", header: "", render: (wallet) => (
              <button onClick={(e) => handleOpenAdjust(wallet, e)} className="p-2 rounded-lg hover:bg-primary/15 text-primary transition" title="Manual correction">
                <RefreshCw className="w-4 h-4" />
              </button>
            ) },
          ]}
        />
      </section>

      <Drawer open={!!selectedTopUp} onClose={() => setSelectedTopUp(null)} title="Top-Up Verification" width="max-w-2xl">
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

      {adjustModalOpen && activeWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface max-w-md w-full rounded-2xl border border-sidebar-border p-6 space-y-4">
            <h3 className="text-lg font-bold text-gradient-purple">Manual Wallet Correction</h3>
            <p className="text-xs text-muted-foreground">
              Use this only for admin corrections, refunds, or balance fixes for <strong className="text-foreground">{activeWallet.worker.fullName}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAdjustType("adjustment")} className={`h-10 rounded-lg text-xs font-bold border transition ${adjustType === "adjustment" ? "bg-primary/10 border-primary text-primary" : "bg-surface-light border-sidebar-border text-muted-foreground"}`}>Correction</button>
              <button type="button" onClick={() => setAdjustType("refund")} className={`h-10 rounded-lg text-xs font-bold border transition ${adjustType === "refund" ? "bg-emerald-500/10 border-emerald-500 text-emerald-300" : "bg-surface-light border-sidebar-border text-muted-foreground"}`}>Refund</button>
            </div>
            <input type="number" placeholder="Amount, e.g. -500 or 250" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="w-full h-11 bg-surface-light rounded-xl border border-sidebar-border px-3 text-sm focus:outline-none focus:border-primary font-bold" />
            <input type="text" placeholder="Required reason" value={adjustDescription} onChange={(e) => setAdjustDescription(e.target.value)} className="w-full h-11 bg-surface-light rounded-xl border border-sidebar-border px-3 text-sm focus:outline-none focus:border-primary" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setAdjustModalOpen(false); setActiveWallet(null); }} className="flex-1 h-11 rounded-xl bg-surface-light hover:bg-surface-light/80 font-bold transition text-sm">Cancel</button>
              <button onClick={handleConfirmAdjust} disabled={adjustMutation.isPending} className="flex-1 h-11 rounded-xl gradient-purple text-foreground font-bold glow-purple transition text-sm flex items-center justify-center">
                {adjustMutation.isPending ? "Saving..." : "Apply Correction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper?: string; icon: any; tone: "cyan" | "amber" | "purple" | "red" }) {
  const toneClass = {
    cyan: "text-primary bg-primary/10 border-primary/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
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
    commissionEnabled: true,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      platformFeePercentage: settings.platformFeePercentage,
      minimumWalletBalance: settings.minimumWalletBalance,
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

    updateMutation.mutate({
      platformFeePercentage: Number(form.platformFeePercentage),
      minimumWalletBalance: Number(form.minimumWalletBalance),
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="Rs. 5,000 job commission" value={fmtPKR(previewCommission)} accent={form.commissionEnabled ? "text-amber-300" : "text-muted-foreground"} />
            <InfoBox label="Required wallet balance" value={fmtPKR(previewRequired)} accent="text-primary" />
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
                      <div className={`text-[10px] font-bold uppercase ${ready ? "text-emerald-300" : "text-amber-300"}`}>
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-primary text-sm font-extrabold">{request.requestId}</div>
          <div className="text-xs text-muted-foreground">{format(new Date(request.createdAt), "dd MMM yyyy HH:mm")}</div>
        </div>
        <StatusPill status={request.status} />
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-light">
        <Avatar src={request.worker?.profileImage} name={request.worker?.fullName || "Worker"} size={52} />
        <div>
          <div className="font-bold">{request.worker?.fullName || "Unknown worker"}</div>
          <div className="text-xs text-muted-foreground">{request.worker?.phone || "No phone"} · {request.worker?.category || "No category"}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoBox label="Amount" value={fmtPKR(request.amount)} accent="text-emerald-300" />
        <InfoBox label="Method" value={METHOD_LABEL[request.method] || request.method} />
        <InfoBox label="Account Title" value={request.paymentDetailsSnapshot?.accountTitle || "Not set"} />
        <InfoBox label="Account Number" value={request.paymentDetailsSnapshot?.accountNumber || request.paymentDetailsSnapshot?.iban || "Not set"} />
      </div>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Uploaded Proof</div>
        <a href={request.proofImageUrl} target="_blank" rel="noreferrer" className="block rounded-2xl overflow-hidden border border-sidebar-border bg-surface-light">
          <img src={request.proofImageUrl} alt="Payment proof" className="w-full max-h-[420px] object-contain bg-black/30" />
        </a>
      </div>

      {request.status === "pending" ? (
        <div className="space-y-3">
          <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Admin notes (optional)" className="w-full min-h-24 bg-surface-light rounded-xl border border-sidebar-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          <div className="flex gap-3">
            <button onClick={() => onApprove(adminNotes)} disabled={isApproving || isRejecting} className="flex-1 h-11 rounded-xl gradient-success text-background font-extrabold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {isApproving ? "Approving..." : "Approve & Credit"}
            </button>
          </div>
          <div className="space-y-2">
            <input value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Rejection reason required before rejecting" className="w-full h-11 bg-surface-light rounded-xl border border-sidebar-border px-3 text-sm focus:outline-none focus:border-destructive" />
            <button onClick={() => onReject(rejectionReason, adminNotes)} disabled={isApproving || isRejecting || !rejectionReason.trim()} className="w-full h-11 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive font-extrabold flex items-center justify-center gap-2 disabled:opacity-50">
              <XCircle className="w-4 h-4" /> {isRejecting ? "Rejecting..." : "Reject Request"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-surface-light border border-sidebar-border">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Admin Decision</div>
          <div className="mt-2 text-sm text-foreground">{request.adminNotes || "No admin notes"}</div>
          {request.rejectionReason && <div className="mt-2 text-sm text-destructive">{request.rejectionReason}</div>}
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
    recharge: { color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20", label: "Recharge", icon: ArrowDownLeft },
    commission_deduction: { color: "text-amber-300 bg-amber-500/10 border-amber-500/20", label: "Commission", icon: ArrowUpRight },
    refund: { color: "text-blue-300 bg-blue-500/10 border-blue-500/20", label: "Refund", icon: RefreshCw },
    adjustment: { color: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20", label: "Adjustment", icon: Info },
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
        <InfoBox label="Available Balance" value={fmtPKR(availableBalance)} accent={availableBalance < 500 ? "text-destructive" : "text-emerald-300"} />
        <InfoBox label="Held for Active Jobs" value={fmtPKR(wallet.reservedBalance || 0)} accent="text-amber-300" />
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
                <div className={`text-sm font-extrabold ${isPositive ? "text-emerald-300" : "text-destructive"}`}>
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
