"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";
import { ReportFormValues } from "@/lib/validations/report";
import { cn } from "@/lib/utils";

export function StockCard() {
  const { register, formState: { errors } } = useFormContext<ReportFormValues>();

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
          <Input 
            type="number" 
            placeholder="0" 
            {...register("stockLpg3kg")} 
            className={cn(
              "bg-background border-input",
              errors.stockLpg3kg && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {errors.stockLpg3kg && (
            <p className="text-xs text-red-500 font-medium">{errors.stockLpg3kg.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">LPG 5.5 Kg</Label>
          <Input 
            type="number" 
            placeholder="0" 
            {...register("stockLpg5kg")} 
            className={cn(
              "bg-background border-input",
              errors.stockLpg5kg && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {errors.stockLpg5kg && (
            <p className="text-xs text-red-500 font-medium">{errors.stockLpg5kg.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">LPG 12 Kg</Label>
          <Input 
            type="number" 
            placeholder="0" 
            {...register("stockLpg12kg")} 
            className={cn(
              "bg-background border-input",
              errors.stockLpg12kg && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {errors.stockLpg12kg && (
            <p className="text-xs text-red-500 font-medium">{errors.stockLpg12kg.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
