"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  FileText,
  MapPin,
  Store,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Target,
  Calendar,
  Package,
  FlaskConical,
  Fuel,
  ClipboardList,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type StoreType = {
  id: string;
  name: string;
  type: string;
  location: string;
  seName: string | null;
  targetSpd: number | null;
};

type ReportSummary = {
  id: string;
  reportDate: string;
  totalSales: number | null;
  salesGroceries: number | null;
  salesLpg: number | null;
  salesPelumas: number | null;
  isStoreHealthy: string | null;
  targetSpdSnapshot: number | null;
  isPushedToWa: boolean | null;
  storeId: string;
  storeName: string;
};

type ReportDetail = {
  report: {
    id: string;
    reportDate: string;
    salesGroceries: number | null;
    salesLpg: number | null;
    salesPelumas: number | null;
    totalSales: number | null;
    targetSpdSnapshot: number | null;
    fulfillmentPb: string | null;
    avgFulfillmentDc: string | null;
    itemOos: unknown;
    stockLpg3kg: number | null;
    stockLpg5kg: number | null;
    stockLpg12kg: number | null;
    waste: number | null;
    losses: number | null;
    isStoreHealthy: string | null;
    needSupport: string | null;
    isPushedToWa: boolean | null;
  };
  store: {
    id: string;
    name: string;
    type: string;
    location: string;
    seName: string | null;
    operationalYear: number | null;
    saCount: number | null;
    operationalHours: string | null;
    priceCluster: string | null;
    targetSpd: number | null;
  } | null;
  author: { name: string; email: string } | null;
  computed: {
    dateString: string;
    totalSales: number;
    targetSpd: number;
    pencapaian: string;
    healthStatus: string;
    salesDetailsList: string;
    oosString: string;
    mtd: { label: string; totalSales: number; spd: number };
    ytd: {
      periodLabel: string;
      totalSales: number;
      reportCount: number;
    };
    monthlySpdList: string[];
    yearlySpdList: string[];
  };
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ITEMS_PER_PAGE = 6;

export function ReportManagement() {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(stores.length / ITEMS_PER_PAGE)),
    [stores.length],
  );
  const paginatedStores = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return stores.slice(start, start + ITEMS_PER_PAGE);
  }, [stores, currentPage]);

  useEffect(() => {
    Promise.all([
      apiClient<{ stores: StoreType[] }>("/dashboard/stores"),
      apiClient<{ reports: ReportSummary[] }>("/dashboard/reports"),
    ])
      .then(([storesData, reportsData]) => {
        setStores(storesData.stores);
        setReports(reportsData.reports);
      })
      .catch(() => {
        toast.error("Gagal memuat data.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [stores.length]);

  function groupReportsByStore() {
    const grouped = new Map<string, ReportSummary[]>();
    for (const r of reports) {
      if (!grouped.has(r.storeId)) {
        grouped.set(r.storeId, []);
      }
      grouped.get(r.storeId)!.push(r);
    }
    return grouped;
  }

  async function openDetail(reportId: string) {
    setDetailLoading(true);
    try {
      const data = await apiClient<ReportDetail>(
        `/dashboard/reports/detail?id=${reportId}`,
      );
      setSelectedReport(data);
      setIsDetailOpen(true);
    } catch {
      toast.error("Gagal memuat detail laporan.");
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-75 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const groupedByStore = groupReportsByStore();

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedStores.map((storeItem) => {
          const storeReports = groupedByStore.get(storeItem.id) || [];
          const latest = storeReports[0];

          return (
            <Card
              key={storeItem.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => latest && openDetail(latest.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">
                        {storeItem.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" />
                        {storeItem.location}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {latest ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(latest.reportDate)}
                      </span>
                      <Badge
                        variant={
                          latest.isStoreHealthy === "store tidak sehat"
                            ? "destructive"
                            : "default"
                        }
                        className={`text-xs ${
                          latest.isStoreHealthy !== "store tidak sehat"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/15"
                            : ""
                        }`}
                      >
                        {latest.isStoreHealthy !== "store tidak sehat" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Sehat
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" /> Tidak
                            Sehat
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Sales
                      </span>
                      <span className="font-semibold">
                        {currency.format(latest.totalSales || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" />
                        Target
                      </span>
                      <span className="font-semibold">
                        {currency.format(storeItem.targetSpd || 0)}
                      </span>
                    </div>
                    {storeItem.targetSpd && latest.totalSales ? (
                      <div className="pt-1">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Pencapaian</span>
                          <span>
                            {(
                              (latest.totalSales / storeItem.targetSpd) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              latest.totalSales / storeItem.targetSpd >= 100
                                ? "bg-green-500"
                                : latest.totalSales / storeItem.targetSpd >= 75
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{
                              width: `${Math.min((latest.totalSales / storeItem.targetSpd) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                    {storeReports.length > 1 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        {storeReports.length} laporan tersedia
                      </p>
                    )}
                    <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>Klik untuk detail</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mb-2" />
                    <p className="text-sm">Belum ada laporan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {stores.length === 0 && (
          <div className="col-span-full flex justify-center py-12 text-muted-foreground">
            <p>Tidak ada store ditemukan.</p>
          </div>
        )}
      </div>

      {stores.length > 0 && (
        <div className="mt-6 justify-end flex">
          <Pagination className="justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === currentPage}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : selectedReport ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Laporan Sales - {selectedReport.store?.name || "-"}
                </DialogTitle>
                <DialogDescription>
                  {selectedReport.computed.dateString}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-muted-foreground">Store</span>
                    <span className="font-medium">
                      {selectedReport.store?.name || "-"}
                    </span>
                    <span className="text-muted-foreground">Lokasi</span>
                    <span className="font-medium">
                      {selectedReport.store?.location || "-"}
                    </span>
                    <span className="text-muted-foreground">SE Name</span>
                    <span className="font-medium">
                      {selectedReport.store?.seName || "-"}
                    </span>
                    <span className="text-muted-foreground">
                      Tahun Operasional
                    </span>
                    <span className="font-medium">
                      {selectedReport.store?.operationalYear || "-"}
                    </span>
                    <span className="text-muted-foreground">
                      Jam Operasional
                    </span>
                    <span className="font-medium">
                      {selectedReport.store?.operationalHours || "-"}
                    </span>
                    <span className="text-muted-foreground">Cluster Harga</span>
                    <span className="font-medium">
                      {selectedReport.store?.priceCluster || "-"}
                    </span>
                    <span className="text-muted-foreground">Jumlah SA</span>
                    <span className="font-medium">
                      {selectedReport.store?.saCount || "-"} orang
                    </span>
                    <span className="text-muted-foreground">Kondisi Store</span>
                    <span className="font-medium">
                      <Badge
                        variant={
                          selectedReport.computed.healthStatus !== "Sehat"
                            ? "destructive"
                            : "default"
                        }
                        className={
                          selectedReport.computed.healthStatus === "Sehat"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/15"
                            : ""
                        }
                      >
                        {selectedReport.computed.healthStatus === "Sehat" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Sehat
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" /> Tidak
                            Sehat
                          </>
                        )}
                      </Badge>
                    </span>
                    <span className="text-muted-foreground">Author</span>
                    <span className="font-medium">
                      {selectedReport.author?.name || "-"}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    Rincian Sales
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" /> Groceries
                      </span>
                      <span className="font-medium">
                        {currency.format(
                          selectedReport.report.salesGroceries || 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <FlaskConical className="h-3.5 w-3.5" /> Sales LPG
                      </span>
                      <span className="font-medium">
                        {currency.format(selectedReport.report.salesLpg || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Fuel className="h-3.5 w-3.5" /> Pelumas
                      </span>
                      <span className="font-medium">
                        {currency.format(
                          selectedReport.report.salesPelumas || 0,
                        )}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total Sales (SPD)</span>
                      <span>
                        {currency.format(selectedReport.computed.totalSales)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target SPD</span>
                      <span>
                        {currency.format(selectedReport.computed.targetSpd)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pencapaian</span>
                      <span
                        className={`font-semibold ${
                          parseFloat(selectedReport.computed.pencapaian) >= 100
                            ? "text-green-600"
                            : parseFloat(selectedReport.computed.pencapaian) >=
                                75
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {selectedReport.computed.pencapaian}
                      </span>
                    </div>
                    {selectedReport.computed.targetSpd > 0 && (
                      <div className="w-full bg-muted rounded-full h-2.5 mt-1">
                        <div
                          className={`h-2.5 rounded-full ${
                            parseFloat(selectedReport.computed.pencapaian) >=
                            100
                              ? "bg-green-500"
                              : parseFloat(
                                    selectedReport.computed.pencapaian,
                                  ) >= 75
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(parseFloat(selectedReport.computed.pencapaian), 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4" />
                    Info SC &amp; MD
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Fulfillment PB
                      </span>
                      <span className="font-medium">
                        {selectedReport.report.fulfillmentPb || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Avg Fulfillment DC
                      </span>
                      <span className="font-medium">
                        {selectedReport.report.avgFulfillmentDc || 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4" />
                    Item OOS
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm">
                      {selectedReport.computed.oosString}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1.5">
                    <Package className="h-4 w-4" />
                    Stock LPG
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LPG 3kg</span>
                      <span className="font-medium">
                        {selectedReport.report.stockLpg3kg || 0} tabung
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LPG 5.5kg</span>
                      <span className="font-medium">
                        {selectedReport.report.stockLpg5kg || 0} tabung
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LPG 12kg</span>
                      <span className="font-medium">
                        {selectedReport.report.stockLpg12kg || 0} tabung
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    MTD / YTD
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-xs text-muted-foreground">
                      {selectedReport.computed.mtd.label}
                    </p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Sales MTD
                      </span>
                      <span className="font-medium">
                        {currency.format(
                          selectedReport.computed.mtd.totalSales,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Sales Per Day MTD
                      </span>
                      <span className="font-medium">
                        {currency.format(selectedReport.computed.mtd.spd)}
                      </span>
                    </div>
                    {selectedReport.computed.monthlySpdList.length > 0 && (
                      <>
                        <p className="font-medium text-xs text-muted-foreground pt-2">
                          Monthly SPD
                        </p>
                        {selectedReport.computed.monthlySpdList.map(
                          (item, i) => (
                            <p key={i} className="text-xs">
                              {item}
                            </p>
                          ),
                        )}
                      </>
                    )}
                    {selectedReport.computed.yearlySpdList.length > 0 && (
                      <>
                        <p className="font-medium text-xs text-muted-foreground pt-2">
                          Yearly SPD
                        </p>
                        {selectedReport.computed.yearlySpdList.map(
                          (item, i) => (
                            <p key={i} className="text-xs">
                              {item}
                            </p>
                          ),
                        )}
                      </>
                    )}
                    <div className="flex justify-between pt-1">
                      <span className="text-muted-foreground">
                        {selectedReport.computed.ytd.periodLabel}
                      </span>
                      <span className="font-medium">
                        {currency.format(
                          selectedReport.computed.ytd.totalSales,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Shrinkage Management
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Waste</span>
                      <span className="font-medium">
                        Rp{" "}
                        {(selectedReport.report.waste || 0).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Losses</span>
                      <span className="font-medium">
                        Rp{" "}
                        {(selectedReport.report.losses || 0).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedReport.report.needSupport &&
                  selectedReport.report.needSupport !== "-" && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" />
                        Need Support
                      </h4>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <p className="text-sm">
                          {selectedReport.report.needSupport}
                        </p>
                      </div>
                    </div>
                  )}

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                  <span>
                    {selectedReport.report.isPushedToWa
                      ? "✓ Terkirim ke WA"
                      : "✗ Belum dikirim ke WA"}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
