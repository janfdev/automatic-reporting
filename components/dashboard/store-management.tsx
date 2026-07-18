"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Edit, Trash2, Check, User, Users } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-client";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Store = {
  id: string;
  name: string;
  type: string;
  region: string | null;
  location: string;
  seName: string | null;
  saCount: number | null;
  operationalYear: number | null;
  operationalHours: string | null;
  priceCluster: string | null;
  targetSpd: number | null;
  createdAt: string;
};

type KasirUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  storeId: string | null;
};

export function StoreManagement() {
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [kasirUsers, setKasirUsers] = useState<KasirUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "Bright Store",
    region: "",
    location: "",
    targetSpd: 0,
    operationalYear: new Date().getFullYear(),
    operationalHours: "",
    priceCluster: "",
    seUserId: "",
    assignedUserIds: [] as string[]
  });

  const loadStores = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/stores?page=${p}&limit=${limit}`);
      const json = await res.json();
      setStores(json.stores || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch {
      setError("Gagal memuat daftar store. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  };

  const loadKasirUsers = async () => {
    try {
      const usersResult = await apiClient<{ users: KasirUser[] }>("/dashboard/users");
      setKasirUsers(usersResult.users.filter(u => u.role === "kasir"));
    } catch {
      console.error("Failed to fetch users");
    }
  };

  useEffect(() => {
    Promise.all([loadStores(page), loadKasirUsers()]);
  }, [page]);

  const assignedUsers = kasirUsers.filter(u =>
    formData.assignedUserIds.includes(u.id)
  );

  const handleToggleUser = (userId: string) => {
    setFormData(prev => {
      const isAssigned = prev.assignedUserIds.includes(userId);
      const newIds = isAssigned
        ? prev.assignedUserIds.filter(id => id !== userId)
        : [...prev.assignedUserIds, userId];

      const newSeUserId = isAssigned && prev.seUserId === userId ? "" : prev.seUserId;

      return { ...prev, assignedUserIds: newIds, seUserId: newSeUserId };
    });
  };

  const handleOpenAdd = () => {
    setEditingStoreId(null);
    setFormData({
      name: "",
      type: "Bright Store",
      region: "",
      location: "",
      targetSpd: 0,
      operationalYear: new Date().getFullYear(),
      operationalHours: "",
      priceCluster: "",
      seUserId: "",
      assignedUserIds: []
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (store: Store) => {
    setEditingStoreId(store.id);
    const preAssignedIds = kasirUsers
      .filter(u => u.storeId === store.id)
      .map(u => u.id);

    const seUser = kasirUsers.find(u => u.name === store.seName);

    setFormData({
      name: store.name,
      type: store.type,
      region: store.region || "",
      location: store.location,
      targetSpd: store.targetSpd || 0,
      operationalYear: store.operationalYear || new Date().getFullYear(),
      operationalHours: store.operationalHours || "",
      priceCluster: store.priceCluster || "",
      seUserId: seUser?.id || "",
      assignedUserIds: preAssignedIds
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus store ${name}?`)) return;

    try {
      const res = await fetch(`/api/dashboard/stores?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Store berhasil dihapus.");
        loadStores(page);
        loadKasirUsers();
      } else {
        toast.error(data.error || "Gagal menghapus store.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const body = {
        name: formData.name,
        type: formData.type,
        region: formData.region || null,
        location: formData.location,
        targetSpd: formData.targetSpd,
        operationalYear: formData.operationalYear,
        operationalHours: formData.operationalHours,
        priceCluster: formData.priceCluster,
        seUserId: formData.seUserId || null,
        assignedUserIds: formData.assignedUserIds
      };

      const url = "/api/dashboard/stores";
      const method = editingStoreId ? "PUT" : "POST";
      const payload = editingStoreId ? { ...body, id: editingStoreId } : body;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          editingStoreId
            ? "Store berhasil diperbarui."
            : "Store berhasil ditambahkan."
        );
        setIsDialogOpen(false);
        loadStores(page);
        loadKasirUsers();
      } else {
        toast.error(data.error || "Gagal menyimpan detail store.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && stores.length === 0) {
    return (
      <div className="flex min-h-75 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle>Management Stores</CardTitle>
            <CardDescription>
              Total store terdaftar: {stores.length}
            </CardDescription>
          </div>
          <Button onClick={handleOpenAdd} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Tambah Store
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:hidden">
            {stores.map((store) => (
              <div key={store.id} className="rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{store.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {store.type} - {store.location}
                  </p>
                  <p className="text-xs text-muted-foreground">Region: {store.region || "-"}</p>
                  <p className="text-xs text-muted-foreground">SE: {store.seName || "-"}</p>
                  <p className="text-xs text-muted-foreground">SA: {store.saCount ?? "-"} org</p>
                  <p className="text-xs text-muted-foreground">Jam: {store.operationalHours || "-"}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Target: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(store.targetSpd || 0)}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(store)} title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(store.id, store.name)} title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {stores.length === 0 && !loading && (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                Tidak ada store ditemukan.
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Store</TableHead>
                  <TableHead>SE Name</TableHead>
                  <TableHead>SA Count</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Jam Operasional</TableHead>
                  <TableHead>Target SPD</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {store.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {store.seName || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {store.saCount ?? "-"} org
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {store.location}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {store.type}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {store.region || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {store.operationalHours || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(store.targetSpd || 0)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(store)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(store.id, store.name)}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {stores.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      Tidak ada store ditemukan.
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
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    />
                  </PaginationItem>
                  <PaginationItem className="hidden sm:list-item">
                    <PaginationLink
                      isActive={page === 1}
                      onClick={() => setPage(1)}
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
                    .filter(p => Math.abs(p - page) <= 1 && p > 1 && p < totalPages)
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
                  {page < totalPages - 2 && (
                    <PaginationItem className="hidden sm:list-item">
                      <span className="px-2 text-muted-foreground">...</span>
                    </PaginationItem>
                  )}
                  {totalPages > 1 && (
                    <PaginationItem className="hidden sm:list-item">
                      <PaginationLink
                        isActive={page === totalPages}
                        onClick={() => setPage(totalPages)}
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
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStoreId ? "Edit Store" : "Tambah Store Baru"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi informasi store dan atur kasir yang bertugas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="sname" className="text-left sm:text-right">
                  Nama Store
                </Label>
                <Input
                  id="sname"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="sm:col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="slocation" className="text-left sm:text-right">
                  Lokasi
                </Label>
                <Input
                  id="slocation"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="sm:col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="stype" className="text-left sm:text-right">
                  Tipe
                </Label>
                <Input
                  id="stype"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="sm:col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="sregion" className="text-left sm:text-right">
                  Region
                </Label>
                <Input
                  id="sregion"
                  value={formData.region}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                  className="sm:col-span-3"
                  placeholder="Contoh: Tangerang, Jakarta"
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="spricecluster" className="text-left sm:text-right">
                  Price Cluster
                </Label>
                <Input
                  id="spricecluster"
                  value={formData.priceCluster}
                  onChange={(e) =>
                    setFormData({ ...formData, priceCluster: e.target.value })
                  }
                  className="sm:col-span-3"
                  placeholder="Contoh: Public, Premium"
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="sophours" className="text-left sm:text-right">
                  Jam Operasional
                </Label>
                <Input
                  id="sophours"
                  value={formData.operationalHours}
                  onChange={(e) =>
                    setFormData({ ...formData, operationalHours: e.target.value })
                  }
                  className="sm:col-span-3"
                  placeholder="Contoh: 24 Jam"
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="sopyear" className="text-left sm:text-right">
                  Tahun Operasional
                </Label>
                <Input
                  id="sopyear"
                  type="number"
                  value={formData.operationalYear}
                  onChange={(e) =>
                    setFormData({ ...formData, operationalYear: parseInt(e.target.value) || new Date().getFullYear() })
                  }
                  className="sm:col-span-3"
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="starget" className="text-left sm:text-right">
                  Target SPD
                </Label>
                <Input
                  id="starget"
                  type="number"
                  value={formData.targetSpd}
                  onChange={(e) =>
                    setFormData({ ...formData, targetSpd: parseInt(e.target.value) || 0 })
                  }
                  className="sm:col-span-3"
                  required
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-semibold">Kasir yang Ditugaskan</Label>
                  <Badge variant="secondary" className="ml-auto">
                    {formData.assignedUserIds.length} orang
                  </Badge>
                </div>
                {kasirUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Belum ada user dengan role kasir. Buat user terlebih dahulu.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
                    {kasirUsers.map((user) => {
                      const isAssigned = formData.assignedUserIds.includes(user.id);
                      const isAssignedElsewhere = user.storeId && user.storeId !== editingStoreId;
                      return (
                        <div
                          key={user.id}
                          onClick={() => !isAssignedElsewhere && handleToggleUser(user.id)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                            isAssignedElsewhere
                              ? "opacity-40 cursor-not-allowed bg-muted/30"
                              : isAssigned
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted/50 border border-transparent"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isAssigned
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          }`}>
                            {isAssigned && <Check className="h-3 w-3" />}
                          </div>
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          {isAssignedElsewhere && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              Di store lain
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="seselect" className="text-left sm:text-right">
                  Pilih SE
                </Label>
                <div className="sm:col-span-3">
                  <Select
                    value={formData.seUserId}
                    onValueChange={(val) =>
                      setFormData({ ...formData, seUserId: val })
                    }
                    disabled={assignedUsers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        assignedUsers.length === 0
                          ? "Tentukan kasir terlebih dahulu"
                          : "Pilih SE dari kasir"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.seUserId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      SE Name: {assignedUsers.find(u => u.id === formData.seUserId)?.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingStoreId ? "Simpan Perubahan" : "Simpan Store"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
