"use client";

import { useEffect, useState } from "react";
import { 
  Download, 
  Loader2, 
  LogOut, 
  Users, 
  Store, 
  BarChart3, 
  Heart, 
  Bell, 
  AlertTriangle,
  Wrench,
  Zap,
  Droplet,
  CheckCircle2,
  Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Cell, 
  PieChart, 
  Pie,
  AreaChart,
  Area
} from "recharts";
import { apiClient } from "@/lib/api-client";
import { signOut } from "@/lib/auth-client";
import PageContainer from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import Logo from "@/public/Logo_pertamina.png";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ReportsManagement } from "./reports-management";

// --- Types & Helpers ---

type AnalyticsResponse = {
  summary: {
    totalSalesToday: number;
    totalSalesGroceriesToday: number;
    totalSalesLpgToday: number;
    totalSalesPelumasToday: number;
    totalWasteToday: number;
    totalLossesToday: number;
    totalReportsToday: number;
    totalMessagesSent: number;
    totalSalesMTD: number;
    totalSalesYTD: number;
    totalUsers: number;
    totalStores: number;
  };
  chart: Array<{
    date: string;
    totalSales: number;
    salesGroceries: number;
    salesLpg: number;
    salesPelumas: number;
    waste: number;
    losses: number;
    reports: number;
    waSent: number;
  }>;
};

type StoreType = { id: string; name: string };

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const chartConfig: ChartConfig = {
  sales: {
    label: "Sales",
    color: "#3b82f6"
  }
};

// --- DATA DUMMY ---

const dummySalesTrend = [
  { name: "25 Mei", sales: 196.5 },
  { name: "26 Mei", sales: 207.8 },
  { name: "27 Mei", sales: 218.2 },
  { name: "28 Mei", sales: 233.9 },
  { name: "29 Mei", sales: 225.6 },
  { name: "30 Mei", sales: 221.3 },
  { name: "31 Mei", sales: 248.8 },
];

const dummyNeedSupportTable = [
  { kategori: "Perbaikan Jalan / Akses", jumlah: 68 },
  { kategori: "Mati Listrik", jumlah: 54 },
  { kategori: "Ketersediaan Stok", jumlah: 41 },
  { kategori: "Perbaikan AC / Pendingin", jumlah: 32 },
  { kategori: "Kerusakan Peralatan", jumlah: 27 },
  { kategori: "Kebocoran / Pipa", jumlah: 19 },
  { kategori: "Lampu / Penerangan", jumlah: 14 },
  { kategori: "Koneksi Internet", jumlah: 8 },
  { kategori: "Keamanan", jumlah: 6 },
  { kategori: "Lainnya", jumlah: 5 },
];

const dummyComposition = [
  { name: "Groceries", value: 62.1, color: "#1e3a8a" },
  { name: "LPG", value: 18.7, color: "#22c55e" },
  { name: "Non Fuel", value: 14.8, color: "#f59e0b" },
  { name: "Pelumas", value: 4.4, color: "#a855f7" },
];

// Data disesuaikan persis dengan titik koordinat visual bergelombang pada gambar image_7bcefb.png
const dummyStoreCondition = [
  { 
    title: "Perbaikan / Renovasi", 
    count: "42 Store", 
    percent: "16,2%", 
    color: "#ef4444", 
    icon: <Wrench className="h-4 w-4 text-white" />,
    iconBg: "bg-[#ef4444]",
    gradientId: "gradPerbaikan",
    data: [{ v: 25 }, { v: 15 }, { v: 22 }, { v: 16 }, { v: 30 }, { v: 18 }, { v: 35 }] 
  },
  { 
    title: "Mati Listrik", 
    count: "28 Store", 
    percent: "10,8%", 
    color: "#f59e0b", 
    icon: <Zap className="h-4 w-4 text-white" />,
    iconBg: "bg-[#f59e0b]",
    gradientId: "gradListrik",
    data: [{ v: 20 }, { v: 12 }, { v: 18 }, { v: 14 }, { v: 25 }, { v: 15 }, { v: 28 }] 
  },
  { 
    title: "Gangguan Air", 
    count: "11 Store", 
    percent: "4,2%", 
    color: "#3b82f6", 
    icon: <Droplet className="h-4 w-4 text-white" />,
    iconBg: "bg-[#3b82f6]",
    gradientId: "gradAir",
    data: [{ v: 15 }, { v: 8 }, { v: 12 }, { v: 9 }, { v: 22 }, { v: 11 }, { v: 20 }] 
  },
  { 
    title: "Normal / Tidak Ada Kendala", 
    count: "178 Store", 
    percent: "68,8%", 
    color: "#22c55e", 
    icon: <CheckCircle2 className="h-4 w-4 text-white" />,
    iconBg: "bg-[#22c55e]",
    gradientId: "gradNormal",
    data: [{ v: 120 }, { v: 140 }, { v: 125 }, { v: 145 }, { v: 165 }, { v: 150 }, { v: 178 }] 
  },
];

// --- Main Component ---

export function AdminDashboardTabs() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    async function loadStores() {
      try {
        const storesResult = await apiClient<{ stores: StoreType[] }>("/dashboard/stores");
        if (!mounted) return;
        setStores(storesResult.stores);
      } catch (error) {
        console.error("Failed to fetch stores", error);
      }
    }
    void loadStores();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const analyticsResult = await apiClient<AnalyticsResponse>(
          `/dashboard/analytics?storeId=${selectedStore}`
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
    void loadAnalytics();
    return () => {
      mounted = false;
    };
  }, [selectedStore]);

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
    <PageContainer scrollable>
      <div className="space-y-6 p-2 bg-[#f8fafc]">
        
        {/* --- HEADER DASHBOARD --- */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b pb-4 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="font-black text-xl tracking-tighter text-blue-800 flex items-center">
                <div className="relative w-44 h-12">
                  <Image
                    src={Logo}
                    alt="Pertamina Retail Logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
            <div className="border-l pl-4">
              <h1 className="text-base font-bold text-gray-900 tracking-tight uppercase">Sales Dashboard</h1>
              <p className="text-xs text-gray-500">Ringkasan Performa Seluruh Bright Store</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-blue-600 px-0.5">Periode</span>
              <Select defaultValue="25-31-mei">
                <SelectTrigger className="w-[180px] h-9 bg-white border-gray-200 text-xs shadow-sm focus:ring-0">
                  <SelectValue placeholder="25 Mei - 31 Mei 2026" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25-31-mei">25 Mei - 31 Mei 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-blue-600 px-0.5">Pilih Store</span>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-[160px] h-9 bg-white border-gray-200 text-xs shadow-sm focus:ring-0">
                  <SelectValue placeholder="Semua Store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Store</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2 h-14 pt-5">
              <Button asChild variant="outline" size="sm" className="h-9 bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm text-xs font-medium">
                <a href="/api/dashboard/export-stores" className="flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5 text-gray-500" />
                  <span>Export Excel</span>
                </a>
              </Button>
              
              <Button
                type="button"
                size="sm"
                onClick={onLogout}
                disabled={isSigningOut}
                className="h-9 bg-red-600 hover:bg-red-700 text-white shadow-sm text-xs font-medium flex items-center gap-1.5 rounded-lg px-4"
              >
                {isSigningOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-sm text-red-500">
              {error}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="analytics" className="space-y-6">
            <div className="mb-2">
              <TabsList className="bg-gray-100 p-1 rounded-lg">
                <TabsTrigger value="analytics" className="px-4 py-2 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="reports" className="px-4 py-2 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Laporan Harian
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="analytics" className="space-y-6 mt-0">
              
              {/* --- ROW 1: BARIS KPI GRID COL-6 --- */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full">
                {/* Total User */}
                <Card className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-medium text-gray-400 block">Total User</span>
                      <span className="text-xl font-extrabold text-gray-900">{analytics?.summary.totalUsers ?? 0}</span>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">User terdaftar</p>
                </Card>

                {/* Total Store */}
                <Card className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-medium text-gray-400 block">Total Store</span>
                      <span className="text-xl font-extrabold text-gray-900">{analytics?.summary.totalStores ?? 0}</span>
                    </div>
                    <div className="p-2 bg-green-50 text-green-600 rounded-full">
                      <Store className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Store aktif.</p>
                </Card>

                {/* Total Harian */}
                <Card className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-medium text-gray-400 block">Total Harian</span>
                      <span className="text-base font-extrabold text-gray-900 block truncate">
                        {currency.format(analytics?.summary.totalSalesToday ?? 0)}
                      </span>
                    </div>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-full shrink-0">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 truncate">Berdasarkan laporan hari ini.</p>
                </Card>

                {/* Store Sehat */}
                <Card className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-medium text-gray-400 block">Store Sehat</span>
                    <span className="text-xl font-extrabold text-gray-900 block mt-1">176</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-bold text-green-600">71,8%</span>
                    <div className="p-1.5 bg-green-50 text-green-600 rounded-full">
                      <Heart className="h-3.5 w-3.5 fill-green-600 stroke-none" />
                    </div>
                  </div>
                </Card>

                {/* Store Perlu Perhatian */}
                <Card className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-medium text-gray-400 block">Store Perlu Perhatian</span>
                    <span className="text-xl font-extrabold text-gray-900 block mt-1">54</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-bold text-amber-500">22,0%</span>
                    <div className="p-1.5 bg-amber-50 text-amber-500 rounded-full">
                      <Bell className="h-3.5 w-3.5 fill-amber-500 stroke-none" />
                    </div>
                  </div>
                </Card>

                {/* Store Kritikal */}
                <Card className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-medium text-gray-400 block">Store Kritikal</span>
                    <span className="text-xl font-extrabold text-gray-900 block mt-1">15</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-bold text-red-600">6,1%</span>
                    <div className="p-1.5 bg-red-50 text-red-500 rounded-full">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* --- ROW 2: Trend Sales, Perbandingan, & Shrinkage --- */}
              <div className="grid gap-4 md:grid-cols-12">
                <Card className="md:col-span-6 bg-white border-none shadow-sm">
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-sm font-bold text-gray-800">Trend Sales 7 Hari Terakhir (Semua Store)</CardTitle>
                    <CardDescription className="text-xs text-gray-400">(Rp)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-4">
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dummySalesTrend} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
                          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          <Line 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="var(--color-sales)" 
                            strokeWidth={2} 
                            dot={{ r: 4, fill: "#3b82f6" }} 
                            label={(props) => {
                              const { x, y, value } = props;
                              return (
                                <text x={x} y={y} dy={-10} fill="#1e3a8a" fontSize={10} textAnchor="middle" fontWeight="bold">
                                  {`${value}M`}
                                </text>
                              );
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="md:col-span-3 bg-white border-none shadow-sm flex flex-col justify-between">
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-sm font-bold text-gray-800 text-center">Perbandingan Sales Hari Ini vs Kemarin</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col items-center justify-center flex-1 space-y-4">
                    <div className="flex w-full justify-between items-center px-2 text-center">
                      <div>
                        <p className="text-xs text-blue-600 font-bold">Rp 248.753.320</p>
                        <p className="text-[10px] text-gray-400">Hari Ini</p>
                      </div>
                      <span className="text-xs font-bold text-gray-400 px-2 py-1 bg-gray-100 rounded-full">vs</span>
                      <div>
                        <p className="text-xs text-gray-700 font-bold">Rp 221.251.990</p>
                        <p className="text-[10px] text-gray-400">Kemarin</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center p-2 bg-green-50 text-green-600 rounded-full mb-1">▲</div>
                      <h3 className="text-3xl font-extrabold text-green-600">12,4%</h3>
                      <p className="text-xs text-gray-500">Naik <span className="font-bold text-green-600">Rp 27.501.330</span></p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-3 bg-white border-none shadow-sm flex flex-col justify-between">
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-sm font-bold text-gray-800">Shrinkage (Hari Ini)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="border-r border-gray-100">
                        <p className="text-[10px] text-gray-400">Total Waste</p>
                        <p className="text-xs font-bold text-gray-900">Rp 8.742.300</p>
                        <span className="text-[10px] text-red-500 font-medium block mt-1">▲ 5,2%</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Total Losses</p>
                        <p className="text-xs font-bold text-gray-900">Rp 4.965.120</p>
                        <span className="text-[10px] text-green-600 font-medium block mt-1">▼ -2,1%</span>
                      </div>
                    </div>
                    <div className="w-full bg-purple-50 p-3 rounded-xl text-center">
                      <p className="text-[11px] text-purple-700 font-medium">Total Shrinkage</p>
                      <p className="text-base font-bold text-purple-900">Rp 13.707.420</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* --- ROW 3: TABEL NEED SUPPORT & KOMPOSISI PENJUALAN --- */}
              <div className="grid gap-4 md:grid-cols-12">
                {/* Tabel Need Support */}
                <Card className="md:col-span-8 bg-white border-none shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold text-gray-800">Top 10 Need Support</CardTitle>
                    <CardDescription className="text-[11px] text-gray-400">(Berdasarkan Frekuensi Request)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="text-xs font-bold text-gray-700 h-9">Kategori Kendala</TableHead>
                            <TableHead className="text-xs font-bold text-gray-700 h-9 text-right pr-6">Frekuensi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dummyNeedSupportTable.map((row, idx) => (
                            <TableRow key={idx} className="hover:bg-gray-50/50">
                              <TableCell className="py-2.5 text-xs text-gray-800 font-medium">{row.kategori}</TableCell>
                              <TableCell className="py-2.5 text-xs font-bold text-right text-purple-700 pr-6">{row.jumlah}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Komposisi Penjualan */}
                <Card className="md:col-span-4 bg-white border-none shadow-sm flex flex-col justify-between">
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-sm font-bold text-gray-800">Komposisi Penjualan (Hari Ini)</CardTitle>
                    <CardDescription className="text-[11px] text-gray-400">(Semua Store)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-col items-center justify-center flex-1">
                    <div className="relative h-[150px] w-[150px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dummyComposition} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={2}>
                            {dummyComposition.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center">
                        <p className="text-[10px] text-gray-400">Total</p>
                        <p className="text-xs font-bold text-gray-900">Rp 248,8M</p>
                      </div>
                    </div>
                    <div className="w-full mt-4 space-y-1">
                      {dummyComposition.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-600">{item.name}</span>
                          </div>
                          <span className="font-bold text-gray-800">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* --- ROW 4: PERBAIKAN PERSIS GAMBAR image_7bcefb.png (Update Kondisi Store) --- */}
              <Card className="bg-white border-none shadow-sm rounded-xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-[#1e3a8a] flex items-center gap-1">
                    Update Kondisi Store <span className="text-gray-400 font-normal text-xs">(Saat Ini)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dummyStoreCondition.map((cond, idx) => (
                      <div key={idx} className="border border-gray-100 rounded-xl p-4 bg-white flex flex-col justify-between shadow-xs">
                        {/* Judul & Ikon Sirkular */}
                        <div className="flex items-center gap-2.5 mb-4">
                          <div className={`p-2 ${cond.iconBg} rounded-full flex items-center justify-center`}>
                            {cond.icon}
                          </div>
                          <h4 className="text-xs font-bold text-gray-800 truncate">{cond.title}</h4>
                        </div>
                        
                        {/* Angka Utama & Persentase Samping */}
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-xl font-extrabold text-gray-900">{cond.count}</span>
                          <span className="text-xs font-bold text-gray-400">{cond.percent}</span>
                        </div>

                        {/* Sparkline Area bergelombang dengan Gradasi Transparan */}
                        <div className="h-14 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={cond.data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                              <defs>
                                <linearGradient id={cond.gradientId} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={cond.color} stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor={cond.color} stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <Area 
                                type="monotone" 
                                dataKey="v" 
                                stroke={cond.color} 
                                strokeWidth={1.5} 
                                fill={`url(#${cond.gradientId})`} 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Info Indicator Footer */}
              <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-4 px-1">
                <Info className="h-3.5 w-3.5 text-blue-500 fill-none" />
                <span>Data diperbarui setiap 1 jam. Sumber: Bright System</span>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-0">
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <ReportsManagement />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageContainer>
  );
}