"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCcw, Send } from "lucide-react";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ReportItem = {
  id: string;
  reportDate: string;
  totalSales: number;
  isPushedToWa: boolean;
  authorName: string;
  storeName: string;
};

export function ReportsManagement({
  storeId,
  startDate,
  endDate,
}: {
  storeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  const loadReports = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: p.toString(),
        limit: limit.toString(),
      });
      if (storeId && storeId !== "all") params.append("storeId", storeId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/dashboard/reports?${params.toString()}`);
      const json = await res.json();
      if (json.reports) {
        setReports(json.reports);
        setTotalPages(json.pagination?.totalPages || 1);
      } else {
        setError(json.error || "Gagal memuat daftar laporan.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1); // reset to page 1 on filter change
    loadReports(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, startDate, endDate]);

  useEffect(() => {
    loadReports(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const handleResend = async (id: string) => {
    setSendingId(id);

    try {
      const res = await fetch("/api/send-wa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal mengirim WhatsApp");
        return;
      }

      toast.success("Pesan berhasil dikirim ke WhatsApp!");
      await loadReports();
    } catch {
      toast.error("Terjadi kesalahan saat mengirim pesan.");
    } finally {
      setSendingId(null);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex min-h-75 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-red-500">{error}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <CardTitle>Laporan Harian (Kasir)</CardTitle>
          <CardDescription>
            Daftar laporan yang masuk dari semua cabang.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={() => loadReports(page)}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:hidden">
          {reports.map((rep) => (
            <div key={rep.id} className="rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{rep.storeName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(rep.reportDate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Kasir: {rep.authorName}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Total Sales
                  </p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(rep.totalSales)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    rep.isPushedToWa
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {rep.isPushedToWa ? "Terkirim WA" : "Draft Dashboard"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResend(rep.id)}
                disabled={sendingId === rep.id}
                className="mt-3 w-full"
              >
                {sendingId === rep.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4 text-blue-500" />
                )}
                Kirim Ulang WA
              </Button>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
              Tidak ada laporan ditemukan.
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border hidden sm:block">
          <Table className="min-w-195 lg:min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Toko / Cabang</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead>Status WA</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(rep.reportDate)}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {rep.storeName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {rep.authorName}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(rep.totalSales)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        rep.isPushedToWa
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {rep.isPushedToWa ? "Terkirim WA" : "Draft Dashboard"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(rep.id)}
                      disabled={sendingId === rep.id}
                      title="Kirim Ulang ke WA"
                    >
                      {sendingId === rep.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 text-blue-500" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Tidak ada laporan ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages >= 1 && (
          <div className="mt-4">
            <Pagination className="justify-center sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                  />
                </PaginationItem>
                <PaginationItem className="hidden sm:list-item">
                  <PaginationLink
                    isActive={page === 1}
                    onClick={() => goToPage(1)}
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
                {page > 3 && (
                  <PaginationItem className="hidden sm:list-item">
                    <span className="px-2 text-muted-foreground">...</span>
                  </PaginationItem>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) => Math.abs(p - page) <= 1 && p > 1 && p < totalPages,
                  )
                  .map((p) => (
                    <PaginationItem key={p} className="hidden sm:list-item">
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => goToPage(p)}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                {page < totalPages - 2 && (
                  <PaginationItem className="hidden sm:list-item">
                    <span className="px-2 text-muted-foreground">...</span>
                  </PaginationItem>
                )}
                {totalPages > 1 && (
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationLink
                      isActive={page === totalPages}
                      onClick={() => goToPage(totalPages)}
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                <PaginationItem className="sm:hidden">
                  <span className="flex h-9 items-center px-3 text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
