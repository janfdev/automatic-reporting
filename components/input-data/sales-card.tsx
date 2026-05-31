"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { ReportFormValues } from "@/lib/validations/report";
import { formatRupiahInput, parseNumberInput } from "@/lib/format";
import { cn } from "@/lib/utils";

// Import komponen UI pendukung untuk elemen Radio Group
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function SalesCard() {
  const { control, watch } = useFormContext<ReportFormValues>();
  
  const groceries = watch("salesGroceries") || 0;
  const lpg = watch("salesLpg") || 0;
  const pelumas = watch("salesPelumas") || 0;
  
  const total = Number(groceries) + Number(lpg) + Number(pelumas);

  return (
    <div className="space-y-4">
      {/* --- RADIO KONDISI KESEHATAN STORE (DIATAS CARD SALES) --- */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3">
        <Label className="text-sm font-bold text-gray-700">Status Kondisi Store</Label>
        <Controller
          control={control}
          name="isStoreHealthy"
          render={({ field, fieldState }) => (
            <>
              <RadioGroup 
                className="flex flex-col sm:flex-row gap-4 sm:gap-6" 
                onValueChange={field.onChange} 
                value={field.value}
              >
                <FieldLabel htmlFor="store-sehat-plan" className="cursor-pointer flex-1">
                  <Field orientation="horizontal" className="border p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
                    <FieldContent>
                      <FieldTitle className="text-xs sm:text-sm font-semibold">Store Sehat</FieldTitle>
                      <FieldDescription className="text-[10px] text-muted-foreground">Operasional berjalan normal</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="store sehat" id="store-sehat-plan" />
                  </Field>
                </FieldLabel>
                
                <FieldLabel htmlFor="store-tidak-sehat-plan" className="cursor-pointer flex-1">
                  <Field orientation="horizontal" className="border p-3 rounded-lg hover:bg-gray-50/50 transition-colors">
                    <FieldContent>
                      <FieldTitle className="text-xs sm:text-sm font-semibold">Store Tidak Sehat</FieldTitle>
                      <FieldDescription className="text-[10px] text-muted-foreground">Terdapat kendala operasional</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value="store tidak sehat" id="store-tidak-sehat-plan" />
                  </Field>
                </FieldLabel>
              </RadioGroup>
              
              {fieldState.error && (
                <p className="text-xs text-red-500 font-medium mt-1">{fieldState.error.message}</p>
              )}
            </>
          )}
        />
      </div>

      {/* --- CARD UTAMA SALES --- */}
      <Card className="border-0 shadow-sm rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-red-500 flex items-center gap-2 text-sm font-bold tracking-wide">
            <TrendingUp className="w-4 h-4" />
            SALES
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Sales Groceries (Rp)</Label>
            <Controller
              control={control}
              name="salesGroceries"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatRupiahInput(field.value)}
                    onChange={(e) => field.onChange(parseNumberInput(e.target.value))}
                    className={cn(
                      "bg-background border-input",
                      fieldState.error && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-red-500 font-medium">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Sales LPG (Rp)</Label>
            <Controller
              control={control}
              name="salesLpg"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatRupiahInput(field.value)}
                    onChange={(e) => field.onChange(parseNumberInput(e.target.value))}
                    className={cn(
                      "bg-background border-input",
                      fieldState.error && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-red-500 font-medium">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Sales Pelumas (Rp)</Label>
            <Controller
              control={control}
              name="salesPelumas"
              render={({ field, fieldState }) => (
                <>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatRupiahInput(field.value)}
                    onChange={(e) => field.onChange(parseNumberInput(e.target.value))}
                    className={cn(
                      "bg-background border-input",
                      fieldState.error && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-red-500 font-medium">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground font-bold">Total Sales (Rp)</Label>
            <Input 
              value={total.toLocaleString("id-ID")} 
              className="bg-muted border-input font-bold" 
              readOnly 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}