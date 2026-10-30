import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface DrawerTab {
  value: string;
  label: string;
  content: ReactNode;
  badge?: number | string;
  hidden?: boolean;
}

/**
 * Right-side detail drawer with tabs. Row click → drawer, `...` menu → actions.
 * Built on Radix Dialog (focus trap, Esc, aria) via the shadcn Sheet.
 */
export function DetailDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  leading,
  headerActions,
  tabs,
  defaultTab,
  footer,
  width = "max-w-2xl",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  headerActions?: ReactNode;
  tabs: DrawerTab[];
  defaultTab?: string;
  footer?: ReactNode;
  width?: string;
}) {
  const visible = tabs.filter((t) => !t.hidden);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn("flex w-full flex-col gap-0 border-hairline-strong bg-card p-0 shadow-elev sm:max-w-[min(92vw,42rem)]", width !== "max-w-2xl" && width)}
      >
        <div className="flex items-start gap-3 border-b border-hairline p-5 pr-14">
          {leading}
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-lg font-semibold text-foreground">{title}</SheetTitle>
            <SheetDescription asChild>
              <div className="mt-0.5 text-sm text-muted-foreground">{subtitle ?? <span className="sr-only">Details</span>}</div>
            </SheetDescription>
          </div>
          {headerActions}
        </div>

        <Tabs defaultValue={defaultTab ?? visible[0]?.value} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-5 mt-3 h-auto w-auto justify-start gap-1 overflow-x-auto rounded-xl bg-surface p-1">
            {visible.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5 rounded-lg px-3 py-1.5 text-13 data-[state=active]:bg-card">
                {t.label}
                {t.badge !== undefined && t.badge !== 0 && (
                  <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold tabular-nums text-primary">{t.badge}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {visible.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-0 focus-visible:ring-0">
                {t.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>

        {footer && <div className="border-t border-hairline bg-surface/60 p-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
