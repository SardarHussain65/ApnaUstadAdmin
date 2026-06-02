import { Loader2, Wrench } from "lucide-react";

export function AdminPageLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div className={`${fullScreen ? "min-h-screen" : "min-h-[55vh]"} admin-workspace flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
          <div className="relative w-14 h-14 rounded-2xl gradient-cyan flex items-center justify-center shadow-xl">
            <Wrench className="w-6 h-6 text-background" strokeWidth={2.5} />
          </div>
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-tight text-white">Preparing your workspace</div>
          <div className="mt-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Loading live marketplace data...
          </div>
        </div>
      </div>
    </div>
  );
}
