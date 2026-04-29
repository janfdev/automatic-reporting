"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Send, Loader2, LogOut } from "lucide-react";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ReportFormValues } from "@/lib/validations/report";
import { SalesCard } from "@/components/input-data/sales-card";
import { DistributionCard } from "@/components/input-data/distribution-card";
import { OosCard } from "@/components/input-data/oos-card";
import { StockCard } from "@/components/input-data/stock-card";
import { ShrinkageCard } from "@/components/input-data/shrinkage-card";
import { SupportCard } from "@/components/input-data/support-card";
import { signOut, useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(nameOrEmail: string | undefined): string {
  if (!nameOrEmail) return "U";
  const clean = nameOrEmail.trim();
  if (!clean) return "U";

  if (clean.includes("@")) {
    return clean[0]?.toUpperCase() ?? "U";
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export default function InputDataPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: session } = useSession();

  const methods = useForm<ReportFormValues>({
    defaultValues: {
      salesGroceries: 0,
      salesLpg: 0,
      salesPelumas: 0,
      fulfillmentPb: 0,
      avgFulfillmentDc: 0,
      itemOos: [{ name: "" }, { name: "" }, { name: "" }],
      stockLpg3kg: 0,
      stockLpg5kg: 0,
      stockLpg12kg: 0,
      waste: 0,
      losses: 0,
      needSupport: ""
    }
  });

  const { handleSubmit, reset } = methods;

  const saveReport = async (
    values: ReportFormValues,
    isPushedToWa: boolean
  ) => {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ...values, isPushedToWa })
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "Gagal menyimpan laporan");
    }

    return await response.json();
  };

  const onSaveDraft = async (values: ReportFormValues) => {
    setIsSaving(true);
    const toastId = toast.loading("Menyimpan draft...");
    try {
      await saveReport(values, false);
      toast.success("Draft berhasil disimpan!", { id: toastId });
      reset();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal menyimpan draft";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmitWA = async (values: ReportFormValues) => {
    setIsSending(true);
    const toastId = toast.loading("Menyimpan dan mengirim laporan...");

    try {
      const saveResult = await saveReport(values, true);

      const reportId = saveResult.data.id;

      if (!reportId) {
        throw new Error("Report ID tidak ditemukan");
      }

      const waResponse = await fetch("/api/send-wa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reportId
        })
      });

      if (!waResponse.ok) {
        let errorMessage = "Gagal mengirim ke WhatsApp Gateway";

        try {
          const errorResult = await waResponse.json();
          errorMessage = errorResult.error || errorMessage;
        } catch {
          //
        }

        throw new Error(errorMessage);
      }

      toast.success("Laporan berhasil dikirim ke WhatsApp!", {
        id: toastId
      });

      reset();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Gagal mengirim laporan";

      toast.error(errorMessage, {
        id: toastId
      });
    } finally {
      setIsSending(false);
    }
  };

  const onLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <TooltipProvider>
      <FormProvider {...methods}>
        <div className="min-h-screen bg-muted/30 pb-36 sm:pb-28 md:pb-24">
          <header className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 md:py-4">
            <div className="flex w-full min-w-0 items-center gap-3 md:w-auto md:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  P
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-bold text-sm tracking-widest text-foreground">
                    PERTAMINA
                  </span>
                  <span className="text-xs text-red-600 font-semibold tracking-widest">
                    RETAIL
                  </span>
                </div>
              </div>
              <div className="h-10 w-px bg-border hidden md:block mx-2"></div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-foreground">
                  Sales Daily Report
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Non - Fuel Retail Sales & Operation
                </p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:gap-3 md:w-auto md:flex-nowrap md:gap-4">
              <div className="hidden text-sm text-muted-foreground lg:block">
                Internal Operations System
              </div>
              <div className="flex items-center gap-2 rounded-full border px-2.5 py-1.5 bg-muted/40">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={session?.user?.image ?? ""}
                    alt={session?.user?.name ?? session?.user?.email ?? "User"}
                  />
                  <AvatarFallback>
                    {getInitials(session?.user?.name ?? session?.user?.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-xs font-medium text-foreground">
                    {session?.user?.name ?? "User"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {session?.user?.email ?? "Memuat email..."}
                  </span>
                </div>
              </div>
              <ThemeModeToggle />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLogout}
                disabled={isSigningOut}
                className="gap-2 px-2.5 sm:px-3"
              >
                {isSigningOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>

          <main className="mx-auto mt-1 w-full max-w-7xl px-3 py-4 sm:px-4 md:mt-3 md:px-6 md:py-6 lg:px-8">
            <form className="grid grid-cols-1 items-start gap-4 md:gap-5 lg:grid-cols-2 lg:gap-6">
              <SalesCard />
              <DistributionCard />
              <OosCard />
              <StockCard />
              <ShrinkageCard />
              <SupportCard />
            </form>
          </main>

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:p-4">
            <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-2 sm:grid-cols-1 sm:gap-3">
              {/* <Button
                variant="secondary"
                onClick={handleSubmit(onSaveDraft)}
                disabled={isSaving || isSending}
                className="w-full rounded-md bg-muted px-4 text-foreground hover:bg-muted/80 md:px-8"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Data Saja (Draft)
              </Button> */}
              <Button
                onClick={handleSubmit(onSubmitWA)}
                disabled={isSaving || isSending}
                className="w-full rounded-md border-0 bg-emerald-600 px-4 text-white hover:bg-emerald-700 md:px-8"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit & Send WA
              </Button>
            </div>
          </div>
        </div>
      </FormProvider>
    </TooltipProvider>
  );
}
