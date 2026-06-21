"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Status = "open" | "in_progress" | "resolved";

type SupportReport = {
  id: string;
  reportDate: string;
  needSupport: string | null;
  formKendala: string | null;
  supportStatus: Status;
  kendalaStatus: Status;
  storeName: string;
  authorName: string;
};

type ReportsResponse = {
  reports: SupportReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const STATUS_COLORS: Record<Status, string> = {
  open: "bg-red-500/10 text-red-700 dark:text-red-400",
  in_progress: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400",
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

interface SupportManagementProps {
  /** "support" | "kendala" — which tab to show */
  type: "support" | "kendala";
}

export function SupportManagement({ type }: SupportManagementProps) {
  const { data: session } = useSession();
  const canChangeStatus =
    session?.user.role === "admin" || session?.user.role === "super_admin";

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<SupportReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const loadReports = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/support?page=${p}&limit=${limit}&type=${type}`,
      );
      const data: ReportsResponse = await res.json();
      if (!res.ok) throw new Error("fetch failed");
      setReports(data.reports);
      setTotalPages(data.pagination.totalPages);
    } catch {
      setError("Gagal memuat data. Silakan refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadReports(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    loadReports(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const updateStatus = async (
    reportId: string,
    field: "supportStatus" | "kendalaStatus",
    status: string,
  ) => {
    // Optimistic update
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, [field]: status as Status } : r,
      ),
    );
    try {
      const res = await fetch("/api/dashboard/reports/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, field, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Gagal memperbarui status.");
        loadReports(page); // revert on error
        return;
      }
      toast.success("Status berhasil diperbarui.");
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
      loadReports(page);
    }
  };

  const isSupport = type === "support";
  const title = isSupport ? "Daftar Need Support" : "Daftar Kendala";
  const desc = isSupport
    ? "Laporan yang membutuhkan dukungan dari kasir."
    : "Laporan kendala yang diinput oleh kasir.";

  if (loading && reports.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
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
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadReports(page)}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {/* Mobile cards */}
        <div className="space-y-3 sm:hidden">
          {reports.map((rep) => (
            <div key={rep.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-sm font-semibold">{rep.storeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {rep.authorName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(rep.reportDate).toLocaleDateString("id-ID")}
                  </p>
                </div>
                {isSupport ? (
                  <StatusBadge status={rep.supportStatus} />
                ) : (
                  <StatusBadge status={rep.kendalaStatus} />
                )}
              </div>
              <p className="text-xs text-gray-700 line-clamp-3">
                {isSupport ? rep.needSupport : rep.formKendala}
              </p>
              {canChangeStatus && (
                <Select
                  value={isSupport ? rep.supportStatus : rep.kendalaStatus}
                  onValueChange={(v) =>
                    updateStatus(
                      rep.id,
                      isSupport ? "supportStatus" : "kendalaStatus",
                      v,
                    )
                  }
                >
                  <SelectTrigger className="w-full text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
          {reports.length === 0 && (
            <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
              Tidak ada data ditemukan.
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto rounded-md border">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead>{isSupport ? "Need Support" : "Kendala"}</TableHead>
                <TableHead>Status</TableHead>
                {canChangeStatus && <TableHead>Ubah Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(rep.reportDate).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {rep.storeName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {rep.authorName}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-xs text-gray-700 line-clamp-3 whitespace-pre-wrap">
                      {isSupport ? rep.needSupport : rep.formKendala}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={isSupport ? rep.supportStatus : rep.kendalaStatus}
                    />
                  </TableCell>
                  {canChangeStatus && (
                    <TableCell>
                      <Select
                        value={
                          isSupport ? rep.supportStatus : rep.kendalaStatus
                        }
                        onValueChange={(v) =>
                          updateStatus(
                            rep.id,
                            isSupport ? "supportStatus" : "kendalaStatus",
                            v,
                          )
                        }
                      >
                        <SelectTrigger className="w-[140px] text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {reports.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canChangeStatus ? 6 : 5}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada data ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination className="justify-center sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                </PaginationItem>
                <PaginationItem className="sm:hidden">
                  <span className="flex h-9 items-center px-3 text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 1)
                  .map((p) => (
                    <PaginationItem key={p} className="hidden sm:list-item">
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                <PaginationItem>
                  <PaginationNext
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
