"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppHeader } from "@/components/layout/app-header";
import { reportSchema, ReportFormValues } from "@/lib/validations/report";
import { SalesCard } from "@/components/input-data/sales-card";
import { DistributionCard } from "@/components/input-data/distribution-card";
import { OosCard } from "@/components/input-data/oos-card";
import { StockCard } from "@/components/input-data/stock-card";
import { ShrinkageCard } from "@/components/input-data/shrinkage-card";
import { SupportCard } from "@/components/input-data/support-card";
import { signOut, useSession } from "@/lib/auth-client";

export default function InputDataPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: session } = useSession();

  const methods = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema) as any,
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
      needSupport: "",
    },
  });

  const { handleSubmit, reset } = methods;

  const saveReport = async (values: ReportFormValues, isPushedToWa: boolean) => {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, isPushedToWa }),
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
      const errorMessage = error instanceof Error ? error.message : "Gagal menyimpan draft";
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

      // Fitur baru teman: Pengecekan reportId
      if (!reportId) {
        throw new Error("Report ID tidak ditemukan");
      }

      const waResponse = await fetch("/api/send-wa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });

      if (!waResponse.ok) {
        // Fitur baru teman: Error handling detail dari API
        let errorMessage = "Gagal mengirim ke WhatsApp Gateway";
        try {
          const errorResult = await waResponse.json();
          errorMessage = errorResult.error || errorMessage;
        } catch { /* ignore */ }
        throw new Error(errorMessage);
      }

      toast.success("Laporan berhasil dikirim ke WhatsApp!", { id: toastId });
      reset();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal mengirim laporan";
      toast.error(errorMessage, { id: toastId });
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
          <AppHeader 
            session={session} 
            isSigningOut={isSigningOut} 
            onLogout={onLogout} 
          />

          <main className="mx-auto mt-1 w-full max-w-7xl px-6 py-6 sm:px-4 md:mt-3 md:px-6 md:py-6 lg:px-8">
            <form className="columns-1 lg:columns-2 gap-6 space-y-6">
              <div className="break-inside-avoid"><SalesCard /></div>
              <div className="break-inside-avoid"><StockCard /></div>
              <div className="break-inside-avoid"><OosCard /></div>
              <div className="break-inside-avoid"><ShrinkageCard /></div>
              <div className="break-inside-avoid"><DistributionCard /></div>
              <div className="break-inside-avoid"><SupportCard /></div>
            </form>
          </main>

          <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:p-4">
            <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-2 sm:grid-cols-1 sm:gap-3">
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