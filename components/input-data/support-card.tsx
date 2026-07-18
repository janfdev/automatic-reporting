"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { ReportFormValues } from "@/lib/validations/report";

export function SupportCard() {
  const { control } = useFormContext<ReportFormValues>();

  return (
    <Card className="border-0 shadow-sm rounded-xl h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-red-500 flex items-center gap-2 text-sm font-bold tracking-wide">
          <MessageSquare className="w-4 h-4" />
          LAINNYA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* --- KOLOM TAMBAHAN: KENDALA --- */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Detail Kendala</Label>
          <Controller
            control={control}
            name="formKendala"
            render={({ field }) => (
              <Textarea 
                placeholder="Tuliskan kendala anda" 
                value={field.value ?? ""} 
                onChange={field.onChange}
                onBlur={field.onBlur}
                className="bg-background border-input min-h-[120px] resize-none" 
              />
            )}
          />
        </div>

        {/* --- KOLOM DETAIL NEED SUPPORT --- */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Detail Need Support</Label>
          <Controller
            control={control}
            name="needSupport"
            render={({ field }) => (
              <Textarea 
                placeholder="Tuliskan deskripsi atau detail kebutuhan support secara rinci..." 
                value={field.value ?? ""} 
                onChange={field.onChange}
                onBlur={field.onBlur}
                className="bg-background border-input min-h-[120px] resize-none" 
              />
            )}
          />
        </div>

      </CardContent>
    </Card>
  );
}