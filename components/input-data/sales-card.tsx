"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import { ReportFormValues } from "@/lib/validations/report";
import { formatRupiahInput, parseNumberInput } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SalesCard() {
  const { control, watch } = useFormContext<ReportFormValues>();
  
  const groceries = watch("salesGroceries") || 0;
  const lpg = watch("salesLpg") || 0;
  const pelumas = watch("salesPelumas") || 0;
  
  const total = Number(groceries) + Number(lpg) + Number(pelumas);

  return (
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
  );
}
