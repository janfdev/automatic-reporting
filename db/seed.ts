import "dotenv/config";
import { db } from "./index";
import { store, users, account } from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

const storeDatas = [
  { id: "store_banda_aceh", name: "Bright Banda Aceh", region: "Region I", location: "Aceh" },
  { id: "store_merak_jingga", name: "Bright Merak Jingga", region: "Region I", location: "Medan" },
  { id: "store_kenten", name: "Bright Kenten", region: "Region II", location: "Palembang" },
  { id: "store_serang", name: "Bright Serang", region: "Region III", location: "Banten" },
  { id: "store_bsd", name: "Bright BSD", region: "Region III", location: "Tangerang" },
  { id: "store_fatmawati1", name: "Bright Fatmawati 1", region: "Region III", location: "DKI Jakarta" },
  { id: "store_fatmawati2", name: "Bright Fatmawati 2", region: "Region III", location: "DKI Jakarta" },
  { id: "store_narogong", name: "Bright Narogong", region: "Region IV", location: "Bekasi" },
  { id: "store_cibinong", name: "Bright Cibinong", region: "Region IV", location: "Bogor" },
  { id: "store_dago", name: "Bright Dago", region: "Region IV", location: "Bandung" },
  { id: "store_soetta", name: "Bright Soekarno-Hatta", region: "Region IV", location: "Bandung" },
  { id: "store_darsono", name: "Bright Darsono", region: "Region IV", location: "Cirebon" },
  { id: "store_solo_baru", name: "Bright Solo Baru", region: "Region V", location: "Solo" },
  { id: "store_teras", name: "Bright Teras", region: "Region V", location: "Boyolali" },
  { id: "store_lempuyangan", name: "Bright Lempuyangan", region: "Region V", location: "DI Yogyakarta" },
  { id: "store_jemursari", name: "Bright Jemursari", region: "Region VI", location: "Surabaya" },
  { id: "store_langsep", name: "Bright Langsep", region: "Region VI", location: "Malang" },
  { id: "store_hayam_wuruk", name: "Bright Hayam Wuruk", region: "Region VI", location: "Bali" },
  { id: "store_kupang", name: "Bright Kupang", region: "Region VI", location: "NTT" },
  { id: "store_brigjen", name: "Bright Brigjen", region: "Region VII", location: "Kaltim" },
];

const kasirNames = [
  "Andi Pratama", "Siti Nurhaliza", "Budi Santoso", "Dewi Lestari", "Eko Wibowo",
  "Fitriani Putri", "Gilang Ramadhan", "Hana Permata", "Irfan Hakim", "Joko Susilo",
  "Kartika Sari", "Lukman Hakim", "Maya Angelina", "Nando Prasetyo", "Olivia Tanjung",
  "Putra Wijaya", "Qori Shofia", "Rizky Febian", "Sari Dewi", "Tono Sugiarto",
  "Ulya Rahma", "Vina Panduwinata", "Wahyu Nugroho", "Xena Putri", "Yusuf Maulana",
  "Zahra Amalia", "Arief Budiman", "Citra Kirana", "Dani Kurniawan", "Elisa Gabriela",
  "Fajar Nugraha", "Gita Gutawa", "Hendra Kusuma", "Indah Permatasari", "Jaya Setiabudi",
  "Kenzo Wiryadi", "Lestari Wulandari", "Muhammad Rizal", "Nabila Husna", "Omar Dhani",
];

const seedData = async () => {
  console.log("Memulai proses seeding...\n");

  try {
    // 1. SEED STORES
    console.log("Memulai seeding Stores...");
    for (const s of storeDatas) {
      const existing = await db.query.store.findFirst({
        where: eq(store.id, s.id),
      });

      if (!existing) {
        await db.insert(store).values({
          id: s.id,
          name: s.name,
          type: "Bright Store",
          region: s.region,
          location: s.location,
          seName: null,
          saCount: null,
          operationalYear: 2015 + Math.floor(Math.random() * 10),
          operationalHours: Math.random() > 0.5 ? "24 Jam" : "06:00 - 22:00",
          priceCluster: Math.random() > 0.5 ? "Public" : "Premium",
          targetSpd: (Math.floor(Math.random() * 50) + 50) * 100000,
        });
        console.log(`  Store ${s.name} ditambahkan.`);
      } else {
        console.log(`  Store ${s.name} sudah ada.`);
      }
    }

    // 2. SEED USERS (1 kasir per store)
    console.log("\nMemulai seeding Users...");
    const seededPassword = "password123";
    const dateNow = new Date();

    for (let i = 0; i < storeDatas.length; i++) {
      const s = storeDatas[i];
      const kasirName = kasirNames[i % kasirNames.length];
      const email = `kasir.${s.id.replace("store_", "")}@bright.com`;
      const userId = `usr_${s.id.replace("store_", "")}`;

      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!existingUser) {
        await db.insert(users).values({
          id: userId,
          name: kasirName,
          email,
          emailVerified: true,
          role: "kasir",
          storeId: s.id,
          createdAt: dateNow,
          updatedAt: dateNow,
        });
        console.log(`  User ${kasirName} (${s.name}) ditambahkan.`);

        const hash = await hashPassword(seededPassword);
        await db.insert(account).values({
          id: `acc_${userId}`,
          accountId: email,
          providerId: "credential",
          userId,
          password: hash,
          createdAt: dateNow,
          updatedAt: dateNow,
        });
        console.log(`  Account ${email} dibuat.`);
      } else {
        console.log(`  User ${kasirName} sudah ada.`);
      }
    }

    // 3. SEED ADMIN
    console.log("\nMemulai seeding Admin...");
    const adminId = "usr_admin";
    const adminEmail = "admin@bright.com";
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.id, adminId),
    });

    if (!existingAdmin) {
      await db.insert(users).values({
        id: adminId,
        name: "Super Admin",
        email: adminEmail,
        emailVerified: true,
        role: "admin",
        storeId: null,
        createdAt: dateNow,
        updatedAt: dateNow,
      });
      const hash = await hashPassword(seededPassword);
      await db.insert(account).values({
        id: `acc_${adminId}`,
        accountId: adminEmail,
        providerId: "credential",
        userId: adminId,
        password: hash,
        createdAt: dateNow,
        updatedAt: dateNow,
      });
      console.log(`  Admin ${adminEmail} ditambahkan.`);
    } else {
      console.log(`  Admin sudah ada.`);
    }

    // 4. UPDATE seName & saCount
    console.log("\nMemperbarui seName & saCount...");
    for (const s of storeDatas) {
      const assignedUsers = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.storeId, s.id));

      if (assignedUsers.length > 0) {
        await db.update(store).set({
          seName: assignedUsers[0].name,
          saCount: assignedUsers.length,
        }).where(eq(store.id, s.id));
        console.log(`  ${s.name} → SE: ${assignedUsers[0].name}, SA: ${assignedUsers.length}`);
      }
    }

    console.log("\nSeeding selesai!");
    console.log("\nAkun tersedia:");
    console.log(`  admin@bright.com / ${seededPassword} → admin`);
    for (const s of storeDatas) {
      const email = `kasir.${s.id.replace("store_", "")}@bright.com`;
      console.log(`  ${email} / ${seededPassword} → kasir (${s.name})`);
    }
  } catch (error) {
    console.error("Gagal seeding:", error);
  }
};

seedData();
