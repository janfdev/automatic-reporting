"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { apiClient } from "@/lib/api-client";
import { signOut } from "@/lib/auth-client";
import { useIsMobile } from "@/hooks/use-mobile";
import PageContainer from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
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
    color: "var(--primary)"
  },
  reports: {
    label: "Laporan",
    color: "var(--chart-2)"
  }
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short"
});

function parseChartDate(value: string): Date {
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/;

  if (dateOnlyMatch.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

export function AdminDashboardTabs() {
  const router = useRouter();
  const isMobile = useIsMobile();
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
        const analyticsResult = await apiClient<AnalyticsResponse>(
          "/dashboard/analytics"
        );
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

  const chartData = useMemo(() => {
    const source = analytics?.chart ?? [];
    const today = new Date();
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    return source
      .map((item) => {
        const date = parseChartDate(item.date);
        return {
          ...item,
          parsedDate: date,
          label: dateFormat.format(date)
        };
      })
      .filter(
        (item) => item.parsedDate >= startDate && item.parsedDate <= endDate
      )
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
      .map(({ parsedDate, ...item }) => item);
  }, [analytics]);

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
            {isSigningOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Logout
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex min-h-75 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6 text-sm text-red-500">
            {error}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="analytics" className="space-y-4">
          <div className="mb-1 overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto min-w-full items-stretch gap-1 sm:min-w-0">
              <TabsTrigger
                value="analytics"
                className="flex-1 px-3 py-2 text-xs sm:flex-none sm:text-sm"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="flex-1 px-3 py-2 text-xs sm:flex-none sm:text-sm"
              >
                Laporan Harian
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Harian</CardDescription>
                  <CardTitle className="text-2xl">
                    {currency.format(analytics?.summary.totalSalesToday ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Berdasarkan laporan masuk hari ini.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Laporan Hari Ini</CardDescription>
                  <CardTitle className="text-2xl">
                    {analytics?.summary.totalReportsToday ?? 0}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Jumlah report yang dibuat hari ini.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Pesan Terkirim</CardDescription>
                  <CardTitle className="text-2xl">
                    {analytics?.summary.totalMessagesSent ?? 0}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Akumulasi laporan yang sudah dikirim ke WA.
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Chart Analytics 7 Hari Terakhir</CardTitle>
                <CardDescription>
                  Tren total sales dan jumlah laporan per hari (termasuk hari
                  ini).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={chartConfig}
                  className="h-55 w-full sm:h-65 md:h-80"
                >
                  <BarChart
                    data={chartData}
                    margin={
                      isMobile
                        ? { top: 8, right: 4, left: 4, bottom: 0 }
                        : { top: 12, right: 12, left: 4, bottom: 0 }
                    }
                    barCategoryGap={isMobile ? "24%" : "18%"}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={isMobile ? 1 : 0}
                      minTickGap={isMobile ? 22 : 14}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                    />
                    <YAxis
                      hide={isMobile}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="totalSales"
                      fill="var(--color-totalSales)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={isMobile ? 18 : 26}
                    />
                    <Bar
                      dataKey="reports"
                      fill="var(--color-reports)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={isMobile ? 18 : 26}
                    />
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
