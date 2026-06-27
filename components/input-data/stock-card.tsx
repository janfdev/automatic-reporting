"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";
import { ReportFormValues } from "@/lib/validations/report";
import { cn } from "@/lib/utils";

function formatInt(val: number | string | undefined | null): string {
  if (!val || val === 0) return "";
  return String(val);
}

function parseIntInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? 0 : Number(digits);
}

export function StockCard() {
  const { control } = useFormContext<ReportFormValues>();

  return (
    <Card className="border-0 shadow-sm rounded-xl">
      <CardHeader className="">
        <CardTitle className="text-red-500 flex items-center gap-2 text-sm font-bold tracking-wide">
          <Package className="w-4 h-4" />
          STOCK LPG
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">LPG 3 Kg</Label>
          <Controller
            control={control}
            name="stockLpg3kg"
            render={({ field, fieldState }) => (
              <>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatInt(field.value)}
                  onChange={(e) => field.onChange(parseIntInput(e.target.value))}
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
          <Label className="text-muted-foreground">LPG 5.5 Kg</Label>
          <Controller
            control={control}
            name="stockLpg5kg"
            render={({ field, fieldState }) => (
              <>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatInt(field.value)}
                  onChange={(e) => field.onChange(parseIntInput(e.target.value))}
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
          <Label className="text-muted-foreground">LPG 12 Kg</Label>
          <Controller
            control={control}
            name="stockLpg12kg"
            render={({ field, fieldState }) => (
              <>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatInt(field.value)}
                  onChange={(e) => field.onChange(parseIntInput(e.target.value))}
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
      </CardContent>
    </Card>
  );
}
