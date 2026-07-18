import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ReportFormValues } from "@/lib/validations/report"
import { Controller, useFormContext } from "react-hook-form"

export function RadioHealthStore() {
  const { control } = useFormContext<ReportFormValues>();

  return (
    <Controller
      control={control}
      name="isStoreHealthy"
      render={({ field }) => (
        <RadioGroup 
          className="flex flex-col gap-3 w-full" 
          onValueChange={field.onChange} 
          value={field.value}
        >
          <FieldLabel htmlFor="store-sehat-plan" className="w-full cursor-pointer">
            <Field orientation="horizontal" className="p-4 w-full justify-between items-center">
              <FieldContent>
                <FieldTitle className="text-sm font-semibold">Store Sehat</FieldTitle>
                <FieldDescription />
              </FieldContent>
              <RadioGroupItem value="store sehat" id="store-sehat-plan" />
            </Field>
          </FieldLabel>
          <FieldLabel htmlFor="store-tidak-sehat-plan" className="w-full cursor-pointer">
            <Field orientation="horizontal" className="p-4 w-full justify-between items-center">
              <FieldContent>
                <FieldTitle className="text-sm font-semibold">Store Tidak Sehat</FieldTitle>
                <FieldDescription />
              </FieldContent>
              <RadioGroupItem value="store tidak sehat" id="store-tidak-sehat-plan" />
            </Field>
          </FieldLabel>
        </RadioGroup>
      )}
    />
  )
}
