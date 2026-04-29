"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, QrCode, RefreshCcw, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
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

type Device = {
  device: string;
  name: string;
  status: "connect" | "disconnect";
  quota: string;
  package: string;
};

type GetDevicesResponse = {
  status: boolean;
  data: Device[];
  connected: number;
};

export function WhatsAppManagement() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add device state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDevice, setNewDevice] = useState("");

  // QR Generate state
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [fetchingQr, setFetchingQr] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/device");
      const json = await res.json();
      if (json.status) {
        setDevices(json.data || []);
      } else {
        setError(json.error || "Gagal memuat daftar perangkat WhatsApp.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/whatsapp/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, device: newDevice })
      });
      const json = await res.json();
      if (json.status) {
        toast.success("Perangkat berhasil ditambahkan!");
        setIsAddOpen(false);
        setNewName("");
        setNewDevice("");
        loadDevices(); // reload list
      } else {
        toast.error(json.reason || "Gagal menambahkan perangkat.");
      }
    } catch {
      toast.error("Terjadi kesalahan saat menambahkan perangkat.");
    } finally {
      setAdding(false);
    }
  };

  const handleShowQr = async (deviceNumber: string) => {
    setSelectedDevice(deviceNumber);
    setIsQrOpen(true);
    setFetchingQr(true);
    setQrBase64(null);
    try {
      const res = await fetch("/api/whatsapp/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: deviceNumber })
      });
      const json = await res.json();
      if (json.status && json.url) {
        setQrBase64(json.url);
      } else {
        toast.error(json.reason || "Gagal mendapatkan QR Code.");
        setIsQrOpen(false);
      }
    } catch {
      toast.error("Terjadi kesalahan saat memuat QR Code.");
      setIsQrOpen(false);
    } finally {
      setFetchingQr(false);
    }
  };

  if (loading && devices.length === 0) {
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
            <CardTitle>WhatsApp Devices</CardTitle>
            <CardDescription>
              Kelola perangkat yang terhubung dengan layanan Fonnte.
            </CardDescription>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
            <Button
              variant="outline"
              onClick={loadDevices}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-red-500 mb-4">{error}</div>
          ) : null}

          <div className="space-y-3 md:hidden">
            {devices.map((dev) => (
              <div key={dev.device} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <p className="truncate text-sm font-semibold">
                        {dev.name}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {dev.device}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      dev.status === "connect"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {dev.status}
                  </span>
                </div>
                <p className="mt-2 text-xs capitalize text-muted-foreground">
                  Paket: {dev.package || "Free"}
                </p>
                {dev.status === "disconnect" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShowQr(dev.device)}
                    className="mt-3 w-full"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Scan QR
                  </Button>
                )}
              </div>
            ))}
            {devices.length === 0 && (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                Tidak ada perangkat yang ditemukan. Silakan tambahkan perangkat
                baru.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table className="min-w-175 lg:min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Device</TableHead>
                  <TableHead>Nomor WhatsApp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((dev) => (
                  <TableRow key={dev.device}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        {dev.name}
                      </div>
                    </TableCell>
                    <TableCell>{dev.device}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          dev.status === "connect"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {dev.status}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">
                      {dev.package || "Free"}
                    </TableCell>
                    <TableCell className="text-right">
                      {dev.status === "disconnect" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowQr(dev.device)}
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          Scan QR
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {devices.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Tidak ada perangkat yang ditemukan. Silakan tambahkan
                      perangkat baru.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Device Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Tambah Perangkat Fonnte</DialogTitle>
            <DialogDescription>
              Masukkan detail perangkat untuk dihubungkan. Anda akan perlu
              memindai QR code dari aplikasi WhatsApp nantinya.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDevice}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="name" className="text-left sm:text-right">
                  Nama Device
                </Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Misal: WA Admin Indomaret"
                  className="sm:col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4 sm:gap-4">
                <Label htmlFor="device" className="text-left sm:text-right">
                  Nomor WA
                </Label>
                <Input
                  id="device"
                  value={newDevice}
                  onChange={(e) => setNewDevice(e.target.value)}
                  placeholder="Misal: 08123456789 (Mulai tanpa 62)"
                  className="sm:col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={adding}
                className="w-full sm:w-auto"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={adding}
                className="w-full sm:w-auto"
              >
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tambah
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Buka aplikasi WhatsApp Anda di perangkat{" "}
              <strong>{selectedDevice}</strong>, kemudian pilih "Tautkan
              Perangkat" dan scan kode QR ini.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4 sm:p-6">
            {fetchingQr ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-gray-500">
                  Memuat QR Code Fonnte...
                </p>
              </div>
            ) : qrBase64 ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={`data:image/png;base64,${qrBase64}`}
                  alt="WhatsApp QR Code"
                  className="h-55 w-55 sm:h-66 sm:w-66"
                />
                <p className="max-w-65 text-center text-xs text-gray-500">
                  QR Code ini akan otomatis diperbarui atau kadaluarsa, segera
                  scan sebelum waktunya habis.
                </p>
              </div>
            ) : (
              <p className="text-red-500 text-sm">
                QR Timeout atau Gagal Dimuat.
              </p>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleShowQr(selectedDevice)}
              disabled={fetchingQr}
              className="w-full sm:w-auto"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh QR
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsQrOpen(false);
                loadDevices();
              }}
              className="w-full sm:w-auto"
            >
              Tutup & Cek Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
