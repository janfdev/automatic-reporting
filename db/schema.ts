import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  numeric,
  jsonb,
  uniqueIndex
} from "drizzle-orm/pg-core";

// --- BETTER AUTH CORE TABLES ---
export const users = pgTable("user", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull().unique(), // Diperlukan oleh core auth, walau nanti login via username
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  // Admin Plugin
  role: varchar("role").notNull().default("kasir"),
  banned: boolean("banned"),
  banReason: varchar("banReason"),
  banExpires: timestamp("banExpires"),
  storeId: varchar("stores_id").references(() => store.id),
  deletedAt: timestamp("deletedAt")
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: varchar("userId")
    .notNull()
    .references(() => users.id)
});

export const account = pgTable("account", {
  id: varchar("id").primaryKey(),
  accountId: varchar("accountId").notNull(),
  providerId: varchar("providerId").notNull(),
  userId: varchar("userId")
    .notNull()
    .references(() => users.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: varchar("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"), // Password hash disimpan disini
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull()
});

export const verification = pgTable("verification", {
  id: varchar("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt")
});

export const store = pgTable("stores", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // Bright Store
  location: text("location").notNull(),
  operationalYear: integer("operational_year"),
  seName: text("se_name"),
  saCount: integer("sa_count"),
  operationalHours: text("operational_hours"),
  priceCluster: text("price_cluster"), // Tier 2
  targetSpd: integer("target_spd").default(0), // Target Harian (Admin)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const dailyReports = pgTable("daily_reports", {
  id: varchar("id", { length: 255 }).primaryKey(),
  storeId: varchar("store_id", { length: 255 })
    .references(() => store.id)
    .notNull(),
  authorId: varchar("author_id").references(() => users.id),

  // otomatisasi waktu (kasir tidak perlu input tanggal)
  reportDate: timestamp("report_date").defaultNow().notNull(),

  // Rincian Sales
  salesGroceries: integer("sales_groceries").default(0),
  salesLpg: integer("sales_lpg").default(0),
  salesPelumas: integer("sales_pelumas").default(0),
  totalSales: integer("total_sales").default(0),
  targetSpdSnapshot: integer("target_spd_snapshot"),

  fulfillmentPb: numeric("fullfillment_pb"),
  avgFulfillmentDc: numeric("avg_fulfillment_dc"),

  itemOos: jsonb("item_oos"),

  stockLpg3kg: integer("stock_lpg_3kg").default(0),
  stockLpg5kg: integer("stock_lpg_5kg").default(0),
  stockLpg12kg: integer("stock_lpg_12kg").default(0),

  // Shrinkage
  waste: integer("waste").default(0),
  losses: integer("losses").default(0),

  // Lainnya
  isStoreHealthy: text("is_store_healthy").default("store sehat"),
  needSupport: text("need_support"),
  formKendala: text("form_kendala"),
  supportStatus: text("support_status").default("open").notNull(),
  kendalaStatus: text("kendala_status").default("open").notNull(),
  
  // Status workflow WA
  isPushedToWa: boolean("is_pushed_to_wa").default(false)
});

export const waGroups = pgTable("wa_groups", {
  id: varchar("id", { length: 255 }).primaryKey(),
  groupId: varchar("group_id", { length: 255 }).notNull().unique(),
  name: text("name").notNull(),
  storeId: varchar("store_id", { length: 255 }).references(() => store.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const storeReportSummaries = pgTable(
  "store_report_summaries",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    storeId: varchar("store_id", { length: 255 })
      .references(() => store.id)
      .notNull(),
    periodType: text("period_type").notNull(),
    periodKey: text("period_key").notNull(),
    periodLabel: text("period_label").notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    reportCount: integer("report_count").default(0).notNull(),
    totalSales: integer("total_sales").default(0).notNull(),
    salesGroceries: integer("sales_groceries").default(0).notNull(),
    salesLpg: integer("sales_lpg").default(0).notNull(),
    salesPelumas: integer("sales_pelumas").default(0).notNull(),
    targetSpdSnapshot: integer("target_spd_snapshot"),
    lastReportDate: timestamp("last_report_date"),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    storePeriodUnique: uniqueIndex(
      "store_report_summaries_store_period_unique"
    ).on(table.storeId, table.periodType, table.periodKey)
  })
);
