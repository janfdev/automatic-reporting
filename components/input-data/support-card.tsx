"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { MessageSquare } from "lucide-react";
import { ReportFormValues } from "@/lib/validations/report";
import { cn } from "@/lib/utils";

// Daftar opsi kendala yang disesuaikan persis dengan data Top Need Support dashboard admin
const KENDALA_OPTIONS = [
  "Perbaikan Jalan / Akses",
  "Mati Listrik",
  "Ketersediaan Stok",
  "Perbaikan AC / Pendingin",
  "Kerusakan Peralatan",
  "Kebocoran / Pipa",
  "Lampu / Penerangan",
  "Koneksi Internet",
  "Keamanan",
  "Lainnya"
];

export function SupportCard() {
  const { register, control } = useFormContext<ReportFormValues>();

  return (
    <Card className="border-0 shadow-sm rounded-xl h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-red-500 flex items-center gap-2 text-sm font-bold tracking-wide">
          <MessageSquare className="w-4 h-4" />
          LAINNYA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* --- KOLOM TAMBAHAN: KATEGORI KENDALA --- */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Kategori Kendala</Label>
          <Controller
            control={control}
            name="supportCategory" // Pastikan properti ini sudah terdaftar di tipe ReportFormValues / Zod schema BE
            render={({ field, fieldState }) => (
              <>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger 
                    className={cn(
                      "bg-background border-input w-full",
                      fieldState.error && "border-red-500 focus:ring-red-500"
                    )}
                  >
                    <SelectValue placeholder="Pilih kategori kendala utama..." />
                  </SelectTrigger>
                  <SelectContent>
                    {KENDALA_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item.toLowerCase()}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <p className="text-xs text-red-500 font-medium">{fieldState.error.message}</p>
                )}
              </>
            )}
          />
        </div>

        {/* --- KOLOM DETAIL NEED SUPPORT --- */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Detail Need Support</Label>
          <Textarea 
            placeholder="Tuliskan deskripsi atau detail kebutuhan support secara rinci..." 
            {...register("needSupport")}
            className="bg-background border-input min-h-[120px] resize-none" 
          />
        </div>

      </CardContent>
    </Card>
  );
}