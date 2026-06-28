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
          className="flex flex-row flex-wrap gap-4 sm:gap-6"
          onValueChange={field.onChange} 
          value={field.value}
        >
          <FieldLabel htmlFor="store-sehat-plan">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Store Sehat</FieldTitle>
                <FieldDescription />
              </FieldContent>
              <RadioGroupItem value="store sehat" id="store-sehat-plan" />
            </Field>
          </FieldLabel>
          <FieldLabel htmlFor="store-tidak-sehat-plan">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Store Tidak Sehat</FieldTitle>
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
