import { z } from "zod";

export const reportSchema = z.object({
  salesGroceries: z.coerce
    .number()
    .int("Nominal harus angka bulat")
    .min(0, "Sales tidak boleh negatif")
    .default(0),
  salesLpg: z.coerce
    .number()
    .int("Nominal harus angka bulat")
    .min(0, "Sales tidak boleh negatif")
    .default(0),
  salesPelumas: z.coerce
    .number()
    .int("Nominal harus angka bulat")
    .min(0, "Sales tidak boleh negatif")
    .default(0),

  fulfillmentPb: z.coerce
    .number()
    .int("Fulfillment harus angka")
    .min(0)
    .max(100, "Maksimal 100%")
    .default(0),
  avgFulfillmentDc: z.coerce
    .number()
    .int("Fulfillment harus angka")
    .min(0)
    .max(100, "Maksimal 100%")
    .default(0),

  itemOos: z
    .array(
      z.object({
        name: z
          .string()
          .max(120, "Nama item maksimal 120 karakter")
          .optional()
          .default("")
      })
    )
    .default([]),

  stockLpg3kg: z.coerce
    .number()
    .int("Stock harus angka bulat")
    .min(0)
    .default(0),
  stockLpg5kg: z.coerce
    .number()
    .int("Stock harus angka bulat")
    .min(0)
    .default(0),
  stockLpg12kg: z.coerce
    .number()
    .int("Stock harus angka bulat")
    .min(0)
    .default(0),

  waste: z.coerce.number().int("Nominal harus angka bulat").min(0).default(0),
  losses: z.coerce.number().int("Nominal harus angka bulat").min(0).default(0),

  isStoreHealthy: z
    .enum(["store sehat", "store tidak sehat"])
    .default("store sehat"),
  formKendala: z.string().optional(),  
  needSupport: z.string().optional(),
  supportStatus: z.enum(["open", "in_progress", "resolved"]).default("open"),
  kendalaStatus: z.enum(["open", "in_progress", "resolved"]).default("open")
}).superRefine((data, ctx) => {
  if (data.salesGroceries === 0 && data.salesLpg === 0 && data.salesPelumas === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimal satu sales (Groceries/LPG/Pelumas) harus diisi",
      path: ["salesGroceries"]
    });
  }
});

export type ReportFormValues = z.infer<typeof reportSchema>;
