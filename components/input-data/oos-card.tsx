"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { ReportFormValues } from "@/lib/validations/report";
import { alphaNumericSpaceOnly } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OosCard() {
  const { register, control, formState: { errors } } = useFormContext<ReportFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "itemOos",
  });

  return (
    <Card className="border-0 shadow-sm rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-red-500 flex items-center gap-2 text-sm font-bold tracking-wide">
          <AlertCircle className="w-4 h-4" />
          ITEM OOS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-2 relative">
              <Label className="text-muted-foreground">OOS Item {index + 1}</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <Input 
                    placeholder="Nama item" 
                    {...register(`itemOos.${index}.name` as const, {
                      onChange: (e) => {
                        e.target.value = alphaNumericSpaceOnly(e.target.value);
                      },
                    })}
                    className={cn(
                      "bg-background border-input",
                      errors.itemOos?.[index]?.name && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {errors.itemOos?.[index]?.name && (
                    <p className="text-xs text-red-500 font-medium">{errors.itemOos[index]?.name?.message}</p>
                  )}
                </div>
                {fields.length > 1 && (
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div>
          <Button 
            type="button"
            variant="outline" 
            onClick={() => append({ name: "" })}
            className="text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 border-red-100 mt-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
