"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { apiClient } from "@/lib/api-client";
import { signOut } from "@/lib/auth-client";
import PageContainer from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ReportsManagement } from "./reports-management";

type AnalyticsResponse = {
  summary: {
    totalSalesToday: number;
    totalReportsToday: number;
    totalMessagesSent: number;
  };
  chart: Array<{
    date: string;
    totalSales: number;
    reports: number;
    waSent: number;
  }>;
};

const chartConfig: ChartConfig = {
  totalSales: {
    label: "Total Sales",
    color: "var(--primary)",
  },
  reports: {
    label: "Laporan",
    color: "var(--chart-2)",
  },
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
});

export function AdminDashboardTabs() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const analyticsResult = await apiClient<AnalyticsResponse>("/dashboard/analytics");
        if (!mounted) return;
        setAnalytics(analyticsResult);
      } catch {
        if (!mounted) return;
        setError("Gagal memuat dashboard. Silakan refresh halaman.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const chartData = useMemo(
    () =>
      (analytics?.chart ?? []).map((item) => ({
        ...item,
        label: dateFormat.format(new Date(item.date)),
      })),
    [analytics]
  );

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
    <PageContainer
      scrollable
      pageTitle="Dashboard"
      pageDescription="Analitik laporan harian dan total pesan WA terkirim."
      pageHeaderAction={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <a href="/api/dashboard/export-csv">
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onLogout}
            disabled={isSigningOut}
            className="w-full sm:w-auto"
          >
            {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Logout
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-red-500">{error}</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="mb-4">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Laporan Harian</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Harian</CardDescription>
                  <CardTitle className="text-2xl">{currency.format(analytics?.summary.totalSalesToday ?? 0)}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Berdasarkan laporan masuk hari ini.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Laporan Hari Ini</CardDescription>
                  <CardTitle className="text-2xl">{analytics?.summary.totalReportsToday ?? 0}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Jumlah report yang dibuat hari ini.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Pesan Terkirim</CardDescription>
                  <CardTitle className="text-2xl">{analytics?.summary.totalMessagesSent ?? 0}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Akumulasi laporan yang sudah dikirim ke WA.
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Chart Analytics 14 Hari Terakhir</CardTitle>
                <CardDescription>Tren total sales dan jumlah laporan per hari.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[260px] md:h-[320px] w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="totalSales" fill="var(--color-totalSales)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="reports" fill="var(--color-reports)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports" className="space-y-4">
            <ReportsManagement />
          </TabsContent>
        </Tabs>
      )}
    </PageContainer>
  );
}
