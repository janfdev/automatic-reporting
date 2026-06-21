"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean | null;
  storeId: string | null;
  storeName: string | null;
  createdAt: string;
  status: "Active" | "Blocked";
};

type UsersResponse = {
  users: User[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function UserManagement() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "kasir",
    storeId: "",
  });

  const loadUsers = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const usersResult = await apiClient<UsersResponse>(
        `/dashboard/users?page=${p}&limit=${limit}`,
      );
      setUsers(usersResult);
      setTotalPages(usersResult.pagination?.totalPages || 1);
    } catch {
      setError("Gagal memuat daftar pengguna. Silakan refresh halaman.");
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const storesResult = await apiClient<{
        stores: { id: string; name: string }[];
      }>("/dashboard/stores");
      setStores(storesResult.stores);
    } catch (error) {
      console.error("Failed to fetch stores", error);
    }
  };

  useEffect(() => {
    loadUsers(page);
    loadStores();
  }, [page]);

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "kasir",
      storeId: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      storeId: user.storeId || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna ${name}?`)) return;

    try {
      const res = await fetch(`/api/dashboard/users?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pengguna berhasil dihapus.");
        loadUsers(page);
      } else {
        toast.error(data.error || "Gagal menghapus pengguna.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = "/api/dashboard/users";
      const method = editingUserId ? "PUT" : "POST";
      const body = editingUserId
        ? { ...formData, id: editingUserId }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          editingUserId
            ? "Pengguna berhasil diperbarui."
            : "Pengguna berhasil ditambahkan.",
        );
        setIsDialogOpen(false);
        loadUsers(page);
      } else {
        toast.error(data.error || "Gagal menyimpan detail pengguna.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !users) {
    return (
      <div className="flex min-h-75 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error && !users) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-red-500">{error}</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle>Management Users</CardTitle>
            <CardDescription>
              Total pengguna: {users?.pagination?.total ?? 0}
            </CardDescription>
          </div>
          <Button onClick={handleOpenAdd} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Tambah User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:hidden">
            {(users?.users ?? []).map((user) => (
              <div key={user.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Store: {user.storeName ?? "-"}
                    </p>
                  </div>
                  <span
                    className={
                      user.status === "Active"
                        ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
                        : "rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 whitespace-nowrap"
                    }
                  >
                    {user.status}
                  </span>
                </div>
                <p className="mt-2 text-xs capitalize text-muted-foreground">
                  Role: {user.role}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(user)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDelete(user.id, user.name)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                  </Button>
                </div>
              </div>
            ))}
            {users?.users.length === 0 && (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                Tidak ada pengguna ditemukan.
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border hidden sm:block">
            <Table className="min-w-195 lg:min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users?.users ?? []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {user.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.email}
                    </TableCell>
                    <TableCell className="capitalize whitespace-nowrap">
                      {user.role}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.storeName ?? "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          user.status === "Active"
                            ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap"
                            : "rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 whitespace-nowrap"
                        }
                      >
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(user)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(user.id, user.name)}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users?.users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Tidak ada pengguna ditemukan.
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
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                    .filter(
                      (p) => Math.abs(p - page) <= 1 && p > 1 && p < totalPages,
                    )
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>
              {editingUserId ? "Edit Pengguna" : "Tambah Pengguna Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingUserId
                ? "Ubah detail profil dan role pengguna di bawah ini."
                : "Isi form berikut untuk menambahkan kasir atau admin baru."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="name" className="text-left sm:text-right">
                  Nama
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="sm:col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="email" className="text-left sm:text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled={!!editingUserId} // Disallow email change to avoid complexity, or allow it
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="sm:col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="password" className="text-left sm:text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={
                    editingUserId
                      ? "Kosongkan jika tidak ingin diubah"
                      : "Password akun"
                  }
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="sm:col-span-3"
                  required={!editingUserId}
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="role" className="text-left sm:text-right">
                  Role
                </Label>
                <div className="sm:col-span-3">
                  <Select
                    value={formData.role}
                    onValueChange={(val) =>
                      setFormData({ ...formData, role: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kasir">Kasir</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="storeId" className="text-left sm:text-right">
                  Store
                </Label>
                <div className="sm:col-span-3">
                  <Select
                    value={formData.storeId}
                    onValueChange={(val) =>
                      setFormData({ ...formData, storeId: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Store" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa Store</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {editingUserId ? "Simpan Perubahan" : "Simpan Pengguna"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
