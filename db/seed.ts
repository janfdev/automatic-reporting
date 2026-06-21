import "dotenv/config";
import { db } from "./index";
import { store, users, account } from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

const seedData = async () => {
  console.log("Memulai proses seeding...\n");

  // 1. DATA STORES (seName & saCount dikosongkan dulu, akan diisi otomatis dari user assignment)
  const storeDatas = [
    {
      id: "store_bsd03",
      name: "Bright BSD 03",
      type: "Bright Store",
      location: "Tangerang Selatan, BSD City",
      operationalYear: 2013,
      operationalHours: "24 Jam",
      priceCluster: "Public",
      targetSpd: 7500000,
    },
    {
      id: "store_bintaro01",
      name: "Bright Bintaro 01",
      type: "Bright Store",
      location: "Bintaro Sektor 7",
      operationalYear: 2015,
      operationalHours: "24 Jam",
      priceCluster: "Public",
      targetSpd: 6500000,
    },
    {
      id: "store_fatmawati02",
      name: "Bright Fatmawati 02",
      type: "DODO",
      location: "Jakarta Selatan, Jl. Fatmawati",
      operationalYear: 2018,
      operationalHours: "06:00 - 22:00",
      priceCluster: "Premium",
      targetSpd: 8500000,
    },
  ];

  try {
    for (const s of storeDatas) {
      const existing = await db.query.store.findFirst({
        where: eq(store.id, s.id),
      });

      if (!existing) {
        await db.insert(store).values({
          ...s,
          seName: null,
          saCount: null,
        });
        console.log(`✅ Store ${s.name} berhasil ditambahkan.`);
      } else {
        console.log(`ℹ️ Store ${s.name} sudah ada.`);
      }
    }

    // 2. DATA USERS & AKUN (dengan storeId sudah diisi)
    console.log("\nMemulai seeding Users...");

    const userDatas = [
      {
        id: "usr_001",
        name: "Kasir BSD",
        email: "kasir.bsd@bright.com",
        role: "kasir" as const,
        storeId: "store_bsd03",
        isSe: true,
      },
      {
        id: "usr_002",
        name: "Kasir Bintaro",
        email: "kasir.bintaro@bright.com",
        role: "kasir" as const,
        storeId: "store_bintaro01",
        isSe: true,
      },
      {
        id: "usr_003",
        name: "Admin Fatmawati",
        email: "admin.fatmawati@bright.com",
        role: "admin" as const,
        storeId: "store_fatmawati02",
        isSe: true,
      },
      {
        id: "usr_004",
        name: "Kasir BSD 2",
        email: "kasir.bsd2@bright.com",
        role: "kasir" as const,
        storeId: "store_bsd03",
        isSe: false,
      },
    ];

    const dateNow = new Date();
    const seededPassword = "password123";
    const createdUserIds: string[] = [];

    for (const u of userDatas) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, u.id),
      });

      if (!existingUser) {
        await db.insert(users).values({
          id: u.id,
          name: u.name,
          email: u.email,
          emailVerified: true,
          role: u.role,
          storeId: u.storeId,
          createdAt: dateNow,
          updatedAt: dateNow,
        });

        createdUserIds.push(u.id);
        console.log(`✅ User ${u.name} (${u.storeId}) berhasil ditambahkan.`);
      } else {
        console.log(`ℹ️ User ${u.name} sudah ada.`);
      }

      // Create/update account dengan password hash
      const hash = await hashPassword(seededPassword);
      const existingAccount = await db.query.account.findFirst({
        where: eq(account.userId, u.id),
      });

      if (existingAccount) {
        await db
          .update(account)
          .set({
            accountId: u.email,
            providerId: "credential",
            password: hash,
            updatedAt: dateNow,
          })
          .where(eq(account.id, existingAccount.id));
        console.log(
          `🔐 Password akun ${u.email} diperbarui (Password: ${seededPassword}).`,
        );
      } else {
        await db.insert(account).values({
          id: `acc_${u.id}`,
          accountId: u.email,
          providerId: "credential",
          userId: u.id,
          password: hash,
          createdAt: dateNow,
          updatedAt: dateNow,
        });
        console.log(
          `🔐 Account ${u.email} berhasil ditambahkan (Password: ${seededPassword}).`,
        );
      }
    }

    // 3. Update seName & saCount untuk setiap store berdasarkan user yang di-assign
    console.log("\nMemperbarui seName & saCount dari user assignment...");
    const storeIds = storeDatas.map((s) => s.id);

    for (const storeId of storeIds) {
      const assignedUsers = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.storeId, storeId));

      if (assignedUsers.length > 0) {
        const seUser = assignedUsers[0]; // User pertama dijadikan SE
        await db
          .update(store)
          .set({
            seName: seUser.name,
            saCount: assignedUsers.length,
          })
          .where(eq(store.id, storeId));

        console.log(
          `✅ Store ${storeId} → SE: "${seUser.name}", SA Count: ${assignedUsers.length}`,
        );
      }
    }

    console.log("\n✅ Semua proses Seeding selesai!");
    console.log("\n📋 Akun yang tersedia:");
    for (const u of userDatas) {
      console.log(
        `   ${u.email} / ${seededPassword} → ${u.role} (${u.storeId})`,
      );
    }
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat seeding:", error);
  }
};

seedData();
