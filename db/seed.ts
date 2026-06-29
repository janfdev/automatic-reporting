import "dotenv/config";
import { db } from "./index";
import { store, users, account } from "./schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

const CITY_MAP: Record<string, string> = {
  JAKARTA: "DKI Jakarta",
  TANGERANG: "Tangerang",
  BEKASI: "Bekasi",
  BOGOR: "Bogor",
  BANDUNG: "Bandung",
  SERANG: "Banten",
  CIREBON: "Cirebon",
  DEPOK: "Depok",
  SEMARANG: "Semarang",
  YOGYAKARTA: "DI Yogyakarta",
  BALI: "Bali",
  SURABAYA: "Jawa Timur",
  SIDOARJO: "Jawa Timur",
  MALANG: "Malang",
  JEMBER: "Jember",
  BANYUWANGI: "Banyuwangi",
  SUBANG: "Subang",
  SUKABUMI: "Sukabumi",
  TASIKMALAYA: "Tasikmalaya",
};

// Cities that are ALWAYS store name prefix, never part of store name
const PREFIX_CITIES = new Set([
  "JAKARTA", "TANGERANG", "BEKASI", "BOGOR", "BANDUNG",
  "SURABAYA", "SEMARANG", "YOGYAKARTA", "BALI", "MALANG",
  "JEMBER", "CIREBON", "DEPOK", "SUKABUMI", "TASIKMALAYA",
  "SUBANG",
]);

const REGION_MAP: Record<string, string> = {
  "REG 1": "Region I",
  "REG 2": "Region II",
  "REG 3": "Region III",
  "REG 4": "Region IV",
  "REG 5": "Region V",
  "REG 6": "Region VI",
  "REG 7": "Region VII",
};

function extractRegion(branchName: string): string {
  const reg = branchName.match(/^REG \d/)?.[0] || "";
  return REGION_MAP[reg] || reg;
}

function extractStoreSuffix(branchName: string): string {
  let name = branchName.replace(/^REG \d\s*-\s*BRIGHT\s+/i, "");
  name = name.replace(/^NEW\s+/i, "");
  return name.trim();
}

function stripCityFromSuffix(suffix: string): string {
  const words = suffix.split(/\s+/);
  if (words.length > 1 && PREFIX_CITIES.has(words[0].toUpperCase())) {
    return words.slice(1).join(" ");
  }
  return suffix;
}

function generateId(branchName: string): string {
  const suffix = stripCityFromSuffix(extractStoreSuffix(branchName));
  return "store_" + suffix.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function generateName(branchName: string): string {
  const suffix = extractStoreSuffix(branchName);
  return "Bright " + suffix
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const LOCATION_MAP: Record<string, string> = {
  ...CITY_MAP,
  SOLO: "Jawa Tengah",
  BOYOLALI: "Jawa Tengah",
  TEGAL: "Jawa Tengah",
  BATANG: "Jawa Tengah",
  MAGELANG: "Jawa Tengah",
  MANDALIKA: "NTB",
  KUPANG: "NTT",
  CIASEM: "Subang",
};

function extractLocation(branchName: string): string {
  const afterBright = branchName.replace(/^REG \d\s*-\s*BRIGHT\s+/i, "").replace(/^NEW\s+/i, "");
  const words = afterBright.split(/\s+/);

  for (const word of words) {
    const upper = word.toUpperCase();
    if (LOCATION_MAP[upper]) return LOCATION_MAP[upper];
  }

  if (/REST AREA|KM\s*\d/i.test(afterBright)) return "Jawa Barat";
  if (/WISMA|PLUMPANG|INDUSTRI|GRHA/i.test(afterBright)) return "DKI Jakarta";

  return "Indonesia";
}

function parseTarget(val: string): number {
  return parseInt(val.replace(/[Rp.\s]/g, "").replace(/,/g, ""), 10) || 0;
}

function parseYear(val: string): number | null {
  if (val.toUpperCase() === "TBC") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

// --- RAW DATA FROM task.md ---
const rawData: [string, string, string, number, string, string, string][] = [
  ["REG 3 - BRIGHT GRHA PERTAMINA", "Umbara", "Commercial", 5, "06:00 - 19:00", "2021", "Rp19,702,581"],
  ["REG 3 - BRIGHT JAKARTA ABDUL MUIS", "Jimmi Kurniawan", "Public", 4, "06.00 - 22.00", "2008", "Rp8,424,361"],
  ["REG 3 - BRIGHT JAKARTA BINTARO EX PETRONAS", "Pipin Suhandi", "Public", 4, "00.00 - 23.59", "2013", "Rp10,498,343"],
  ["REG 3 - BRIGHT JAKARTA CAKUNG", "Farhan", "Public", 4, "00.00 - 23.59", "2015", "Rp7,043,958"],
  ["REG 3 - BRIGHT JAKARTA CIKINI", "Umbara", "Public", 5, "00.00 - 23.59", "2008", "Rp8,685,926"],
  ["REG 3 - BRIGHT JAKARTA CIPUTAT", "Pipin Suhandi", "Public", 4, "00.00 - 23.59", "2015", "Rp7,264,391"],
  ["REG 3 - BRIGHT JAKARTA DAAN MOGOT", "Jimmi Kurniawan", "Public", 6, "00.00 - 23.59", "2015", "Rp7,642,315"],
  ["REG 3 - BRIGHT JAKARTA FATMAWATI", "Muhamad Fadilah", "Public", 3, "06.00 - 22.00", "2010", "Rp5,061,061"],
  ["REG 3 - BRIGHT JAKARTA GANDARIA", "Farhan", "Public", 5, "00.00 - 23.59", "2011", "Rp7,440,847"],
  ["REG 3 - BRIGHT JAKARTA GANDARIA CITY", "Pipin Suhandi", "Public", 4, "00.00 - 23.59", "2017", "Rp6,649,854"],
  ["REG 3 - BRIGHT JAKARTA INDUSTRI", "Umbara", "Public", 5, "00:00 - 24:00", "2010", "Rp8,612,220"],
  ["REG 3 - BRIGHT JAKARTA KALIDERES", "Jimmi Kurniawan", "Public", 4, "00.00 - 23.59", "2013", "Rp6,278,504"],
  ["REG 3 - BRIGHT JAKARTA KALIMALANG EX PETRONAS", "Farhan", "Public", 5, "00.00 - 23.59", "2013", "Rp12,028,894"],
  ["REG 3 - BRIGHT JAKARTA KEMANG", "Muhamad Fadilah", "Public", 3, "06.00 - 22.00", "2010", "Rp6,474,633"],
  ["REG 3 - BRIGHT JAKARTA KLENDER", "Farhan", "Public", 3, "00.00 - 23.59", "2013", "Rp4,368,315"],
  ["REG 3 - BRIGHT JAKARTA KUNINGAN", "Muhamad Fadilah", "Public", 6, "00.00 - 23.59", "2008", "Rp16,966,197"],
  ["REG 3 - BRIGHT JAKARTA LENTENG AGUNG", "Muhamad Fadilah", "Public", 5, "00.00 - 23.59", "2015", "Rp8,949,646"],
  ["REG 3 - BRIGHT JAKARTA MANGGA BESAR", "Umbara", "Public", 2, "06:00 - 22:00", "2012", "Rp2,245,523"],
  ["REG 3 - BRIGHT JAKARTA MT. HARYONO", "Muhamad Fadilah", "Public", 7, "00.00 - 23.59", "2009", "Rp14,357,564"],
  ["REG 3 - BRIGHT JAKARTA OTISTA", "Umbara", "Public", 4, "00:00 - 24:00", "2011", "Rp6,939,964"],
  ["REG 3 - BRIGHT JAKARTA PERMATA HIJAU", "Jimmi Kurniawan", "Public", 4, "00.00 - 23.59", "2012", "Rp7,628,633"],
  ["REG 3 - BRIGHT JAKARTA PESING", "Jimmi Kurniawan", "Public", 4, "00.00 - 23.59", "2018", "Rp4,370,643"],
  ["REG 3 - BRIGHT JAKARTA PLUMPANG", "Umbara", "Commercial", 5, "00:00 -24:00", "2021", "Rp10,099,136"],
  ["REG 3 - BRIGHT JAKARTA PONDOK INDAH", "Pipin Suhandi", "Public", 3, "06.00 - 22.00", "2012", "Rp5,071,780"],
  ["REG 3 - BRIGHT JAKARTA PRAMUKA", "Farhan", "Public", 5, "00.00 - 23.59", "2007", "Rp11,226,814"],
  ["REG 3 - BRIGHT JAKARTA PULO GADUNG", "Farhan", "Public", 4, "00.00 - 23.59", "2013", "Rp4,558,868"],
  ["REG 3 - BRIGHT JAKARTA S PARMAN", "Jimmi Kurniawan", "Public", 4, "00.00 - 23.59", "2016", "Rp8,247,169"],
  ["REG 3 - BRIGHT JAKARTA SAMANHUDI", "Umbara", "Public", 2, "06:00 - 22:00", "2011", "Rp3,333,069"],
  ["REG 3 - BRIGHT JAKARTA SUMMARECON KELAPA GADING", "Farhan", "Public", 2, "06.00 - 22.00", "", "Rp3,163,423"],
  ["REG 3 - BRIGHT JAKARTA TENDEAN", "Muhamad Fadilah", "Public", 5, "00.00 - 23.59", "2010", "Rp9,997,007"],
  ["REG 3 - BRIGHT JAKARTA TOMANG", "Jimmi Kurniawan", "Public", 4, "00.00 - 23.59", "2011", "Rp4,689,568"],
  ["REG 3 - BRIGHT NEW JAKARTA KEDOYA", "Ayyub Syahifulloh", "Public", 3, "06.00 - 22.00", "2025", "Rp4,552,800"],
  ["REG 3 - BRIGHT NEW JAKARTA OIL CENTER", "Umbara", "Public", 3, "06:00 - 22:00", "2025", "Rp6,037,500"],
  ["REG 3 - BRIGHT NEW JAKARTA MERUYA", "Ayyub Syahifulloh", "Public", 3, "06.00 - 22.00", "2025", "Rp4,500,000"],
  ["REG 3 - BRIGHT NEW CILILITAN JAKARTA", "Farhan", "Public", 4, "00.00 - 23.59", "2020", "Rp5,789,720"],
  ["REG 3 - BRIGHT SERANG", "Ayyub Syahifulloh", "Public", 3, "06.00 - 22.00", "2012", "Rp2,021,174"],
  ["REG 3 - BRIGHT TANGERANG ALAM SUTERA EX PETRONAS", "Pipin Suhandi", "Public", 3, "06.00 - 22.00", "2013", "Rp5,840,209"],
  ["REG 3 - BRIGHT TANGERANG BSD", "Pipin Suhandi", "Resident", 4, "00.00 - 23.59", "", "Rp12,845,913"],
  ["REG 3 - BRIGHT TANGERANG BSD3", "Pipin Suhandi", "Public", 4, "00.00 - 23.59", "2013", "Rp7,589,295"],
  ["REG 3 - BRIGHT TANGERANG KARAWACI", "Ayyub Syahifulloh", "Public", 4, "00.00 - 23.59", "2011", "Rp9,381,215"],
  ["REG 3 - BRIGHT TANGERANG MODERNLAND", "Pipin Suhandi", "Resident", 3, "06.00 - 22.00", "2010", "Rp6,453,051"],
  ["REG 3 - BRIGHT NEW JAKARTA PURI KEMBANGAN", "Ayyub Syahifulloh", "Commercial", 3, "06.00 - 22.00", "2025", "Rp4,984,000"],
  ["REG 3 - BRIGHT NEW WISMA TUGU", "Muhamad Fadilah", "", 4, "06.00 - 19.00 wib", "2025", "Rp6,300,000"],
  ["REG 4 - BRIGHT BANDUNG CIPULARANG KM 88 A", "Ikbal Hibattuloh", "Leisure", 6, "00.00 - 23.59", "2007", "Rp12,353,563"],
  ["REG 4 - BRIGHT BANDUNG CIPULARANG KM 88 B", "Ikbal Hibattuloh", "Leisure", 4, "00.00 - 23.59", "2007", "Rp7,685,179"],
  ["REG 4 - BRIGHT BANDUNG DAGO", "Opi Oktaviana", "Public", 6, "00.00 - 23.59", "2013", "Rp8,188,952"],
  ["REG 4 - BRIGHT BANDUNG UJUNG BERUNG 1", "Opi Oktaviana", "Public", 3, "06:00 - 22:00", "2009", "Rp6,480,687"],
  ["REG 4 - BRIGHT BEKASI CIKARANG CIBARUSAH", "Idris", "Public", 4, "00.00 - 23.59", "", "Rp7,138,542"],
  ["REG 4 - BRIGHT BEKASI HYUNDAI CIKARANG", "Idris", "Commercial", 6, "00.00 - 23.59", "", "Rp16,860,322"],
  ["REG 4 - BRIGHT BEKASI KAMPUNG BULUH", "Idris", "Resident", 3, "06.00 - 20.00 WIB", "", "Rp4,782,089"],
  ["REG 4 - BRIGHT BEKASI MAJAPAHIT", "Idris", "Resident", 2, "08:00 - 22:00 (bila ada yang libur 09:00 -20:00)", "", "Rp3,502,143"],
  ["REG 4 - BRIGHT BEKASI NAROGONG 2", "Ade Supriadi", "Resident", 3, "06.00 - 22.00", "", "Rp3,058,010"],
  ["REG 4 - BRIGHT BEKASI PAHLAWAN", "Ade Supriadi", "Resident", 3, "06.00 - 22.00", "", "Rp5,252,247"],
  ["REG 4 - BRIGHT BEKASI PONDOK UNGU", "Ade Supriadi", "Public", 3, "06.00 - 22.00", "2019", "Rp3,419,901"],
  ["REG 4 - BRIGHT BEKASI TAMBUN", "Idris", "Public", 2, "06.00 - 22.00", "", "Rp6,763,456"],
  ["REG 4 - BRIGHT BOGOR KM 45 CIAWI", "Muhammad Dudin", "Leisure", 4, "00.00 - 23.59", "2015", "Rp11,525,279"],
  ["REG 4 - BRIGHT BOGOR MAYOR OKING CIBINONG", "Muhammad Dudin", "Public", 3, "06.00-22.00", "", "Rp5,631,354"],
  ["REG 4 - BRIGHT BOGOR TENTARA PELAJAR", "Muhammad Dudin", "Resident", 3, "06.00-22.00", "", "Rp6,201,823"],
  ["REG 4 - BRIGHT CIKAMPEK KM 72B", "Ikbal Hibattuloh", "Leisure", 6, "00.00 - 23.59", "2022", "Rp14,957,719"],
  ["REG 4 - BRIGHT CIREBON DARSONO", "Ikbal Hibattuloh", "Public", 2, "06.00 - 22.00 (bila ada yg libur buka jam 08.00 - 16.00)", "2011", "Rp3,042,378"],
  ["REG 4 - BRIGHT DEPOK MARGONDA", "Muhammad Dudin", "Public", 3, "06.00 - 22.00", "2012", "Rp5,410,661"],
  ["REG 4 - BRIGHT NEW BANDUNG SOREANG", "Opi Oktaviana", "Public", 3, "06:00 - 22:00", "2023", "Rp10,083,894"],
  ["REG 4 - BRIGHT NEW BEKASI TEGAL GEDE", "Idris", "Public", 2, "06:00 - 22:00 (bila ada yg libur 16 jam, bila tidak ada yang libur 24 jam)", "", "Rp6,460,057"],
  ["REG 4 - BRIGHT NEW KIARA CONDONG BANDUNG", "Opi Oktaviana", "Public", 2, "06.00 - 22.00", "2012", "Rp2,526,311"],
  ["REG 4 - BRIGHT NEW SPBU REST AREA KM 19 B", "Idris", "Leisure", 4, "00.00 - 23.59", "2023", "Rp9,216,884"],
  ["REG 4 - BRIGHT SPBU REST AREA KM 6", "Ade Supriadi", "Leisure", 4, "00.00 - 23.59", "2022", "Rp11,388,990"],
  ["REG 4 - BRIGHT SUBANG CIASEM", "Ikbal Hibattuloh", "Public", 3, "06.00 - 22.00", "2018", "Rp4,132,363"],
  ["REG 4 - BRIGHT SUKABUMI TIPAR", "Muhammad Dudin", "Public", 2, "06:00 - 22:00 (bila ada yang libur jam 09:00 - 18:00)", "", "Rp2,538,103"],
  ["REG 4 - BRIGHT TASIKMALAYA MARTADINATA", "Opi Oktaviana", "Public", 2, "06:00 - 22:00 (bila ada yang libur jam 10:00 - 18:00 karna hanya 2 SA)", "2015", "Rp2,729,949"],
  ["REG 5 - BRIGHT BATANG JERAKAH", "Muhammad Nur Kholis", "Public", 4, "00.00 - 23.59", "2015", "Rp6,153,279"],
  ["REG 5 - BRIGHT BOYOLALI TERAS", "Dimas Lucky Aditya", "Public", 2, "00.00 - 23.59", "2003", "Rp6,346,600"],
  ["REG 5 - BRIGHT MAGELANG MENOWO", "Dimas Lucky Aditya", "Public", 2, "07.00 - 21.00", "2009", "Rp3,804,731"],
  ["REG 5 - BRIGHT REST AREA KM 282B", "Amien Nor Sukarno", "Leisure", 3, "00.00 - 23.59", "2024", "Rp6,826,633"],
  ["REG 5 - BRIGHT REST AREA KM 338A", "Muhammad Nur Kholis", "Leisure", 4, "00.00 - 23.59", "2023", "Rp8,974,570"],
  ["REG 5 - BRIGHT SEMARANG AHMAD YANI", "danu irawan", "Public", 3, "00.00 - 23.59", "", "Rp7,063,444"],
  ["REG 5 - BRIGHT SEMARANG KALIGARANG", "danu irawan", "Public", 2, "06.00 - 22.00", "", "Rp3,129,955"],
  ["REG 5 - BRIGHT SEMARANG PENGGARON", "danu irawan", "Public", 3, "00.00 - 23.59", "", "Rp4,467,560"],
  ["REG 5 - BRIGHT SEMARANG SRONDOL", "danu irawan", "Public", 3, "00.00 - 23.59", "", "Rp5,572,977"],
  ["REG 5 - BRIGHT SEMARANG SULTAN AGUNG", "danu irawan", "Public", 2, "00.00 - 23.59", "", "Rp10,418,056"],
  ["REG 5 - BRIGHT SOLO BARU", "Dimas Lucky Aditya", "Public", 2, "07.00 - 21.00", "2006", "Rp2,433,559"],
  ["REG 5 - BRIGHT SPBU REST AREA KM 260B", "Amien Nor Sukarno", "Leisure", 4, "00.00 - 23.59", "2022", "Rp14,297,246"],
  ["REG 5 - BRIGHT SPBU REST AREA KM 360", "Muhammad Nur Kholis", "Leisure", 3, "06:00 - 22:00 (Weekdays) 00.00 - 23.59 (Weekend)", "2022", "Rp7,454,989"],
  ["REG 5 - BRIGHT SPBU REST AREA KM 379A", "Muhammad Nur Kholis", "Leisure", 4, "00.00 - 23.59", "2024", "Rp8,354,219"],
  ["REG 5 - BRIGHT TEGAL MURI", "Amien Nor Sukarno", "Public", 2, "08.00 - 00.00", "2014", "Rp3,113,876"],
  ["REG 5 - BRIGHT YOGYAKARTA ADI SUCIPTO", "Dimas Lucky Aditya", "Public", 3, "06.00 - 22.00", "2011", "Rp4,737,345"],
  ["REG 5 - BRIGHT YOGYAKARTA COKROAMINOTO", "Dimas Lucky Aditya", "Public", 2, "07.00 - 21.00", "2019", "Rp2,454,443"],
  ["REG 5 - BRIGHT YOGYAKARTA LEMPUYANGAN", "Dimas Lucky Aditya", "Resident", 3, "06.00 - 22.00", "2009", "Rp6,737,382"],
  ["REG 6 - BRIGHT BALI HAYAM WURUK", "Muhammad Ariyanto", "Public", 2, "07:00-21:00 (Senin-Jumat ) 08.00-20.00 (Sabtu-Minggu)", "", "Rp3,567,768"],
  ["REG 6 - BRIGHT BANYUWANGI", "Muhammad Ariyanto", "Public", 3, "00.00 - 23.59", "2016", "Rp2,710,530"],
  ["REG 6 - BRIGHT JEMBER KENANGA", "Muhammad Ariyanto", "Resident", 2, "06.00 - 23.59", "2013", "Rp1,166,897"],
  ["REG 6 - BRIGHT JEMBER LECES", "Muhammad Ariyanto", "Public", 3, "00.00 - 23.59", "2015", "Rp2,369,774"],
  ["REG 6 - BRIGHT MALANG LANGSEP", "Yogi Aris Saputra", "Public", 2, "08.00-16.00 (Senin & Rabu) 06.00-22.00 (Selasa, kamis-Minggu)", "", "Rp1,919,886"],
  ["REG 6 - BRIGHT MANDALIKA MOTHER STORE", "Muchibbin", "Leisure", 2, "08.00 - 17.00", "", "Rp10,689,991"],
  ["REG 6 - BRIGHT SPBU REST AREA KM 66A", "Yogi Aris Saputra", "Leisure", 3, "Senin - Jum,at (06.00 - 23.59)18 Jam & Sabtu - Minggu (00.00-23.59) 24 Jam", "2023", "Rp10,176,522"],
  ["REG 6 - BRIGHT SPBU REST AREA KM 725A", "Muchibbin", "Leisure", 3, "Senin - Jumat (06.00-22.00) & Sabtu - Minggu (06.00-00.00)", "2022", "Rp10,189,090"],
  ["REG 6 - BRIGHT SPBU REST AREA KM 84A", "Yogi Aris Saputra", "Leisure", 4, "00.00 - 23.59", "2022", "Rp11,568,095"],
  ["REG 6 - BRIGHT SPBU REST AREA KM 84B", "Yogi Aris Saputra", "Leisure", 3, "Senin - Jumat (06.00 - 23.59)18 Jam & Sabtu - Minggu (00.00-23.59) 24 Jam", "2023", "Rp10,455,841"],
  ["REG 6 - BRIGHT SURABAYA JEMUR SARI", "Muchibbin", "Public", 3, "06.00 - 22.00", "", "Rp4,115,290"],
  ["REG 6 - BRIGHT SURABAYA JUANDA SIDOARJO", "Linda Fitria", "Public", 4, "00.00 - 24.00", "2016", "Rp6,204,782"],
  ["REG 6 - BRIGHT SURABAYA KETINTANG", "Linda Fitria", "Resident", 2, "Senin-Jumat 06.00-22.00, Sabtu-Minggu 08.00-17.00", "2014", "Rp2,358,402"],
  ["REG 6 - BRIGHT SURABAYA MASTRIP", "Linda Fitria", "Public", 2, "06:00 - 22:00 (Kecuali Selasa & Kamis 08:00 - 16:00", "2015", "Rp1,953,690"],
  ["REG 6 - BRIGHT SURABAYA PAKUWON CITY", "Muchibbin", "Resident", 2, "07.00-20.00 (Senin-Jumat) 08.00-16.00 (Sabtu-Minggu )", "", "Rp5,599,369"],
  ["REG 6 - BRIGHT SURABAYA PASAR TURI", "Muchibbin", "Public", 2, "Senin-Jumat (06.00-22.00) & Sabtu-Minggu (08.00-16.00)", "", "Rp1,959,067"],
  ["REG 6 - BRIGHT SURABAYA SOETOMO", "Muchibbin", "Public", 4, "00.00 - 23.59", "", "Rp5,159,736"],
  ["REG 6 - BRIGHT SURABAYA TAMAN SIDOARJO 2", "Linda Fitria", "Public", 3, "06.00 - 22.00", "2016", "Rp2,426,800"],
  ["REG 6 - BRIGHT REST AREA KM 66B", "Yogi Aris Saputra", "Leisure", 4, "00.00 - 23.59", "2024", "Rp4,705,511"],
  ["REG 7 - BRIGHT REST AREA KM 36B", "Muhammad Dudin", "Leisure", 3, "07.00 - 19.00 wib", "2025", "Rp4,755,847"],
  ["REG 3 - BRIGHT JAKARTA FATMAWATI EX PETRONAS", "Muhamad Fadilah", "Public", 5, "00.00 - 23.59", "2013", "Rp7,788,730"],
  ["REG 3 - BRIGHT NEW JAKARTA APARTEMEN PANCORAN", "Muhamad Fadilah", "Resident", 4, "00.00-23.59", "2025", "Rp8,527,917"],
  ["REG 3 - BRIGHT TANGERANG BANDARA SOEHAT", "Pipin Suhandi", "Public", 6, "00.00 - 23.59", "2018", "Rp11,715,997"],
  ["REG 4 - BRIGHT BEKASI A. YANI", "Ade Supriadi", "Public", 6, "00.00 - 23.59", "2009", "Rp15,098,275"],
  ["REG 4 - BRIGHT REST AREA KM 72A", "Ikbal Hibattuloh", "Leisure", 4, "00.00 - 23.59", "2025", "Rp3,697,525"],
  ["REG 4 - BRIGHT NEW UNPAD", "Opi Oktaviana", "Public", 4, "00.00 - 23.59", "2023", "Rp9,366,327"],
];

const storeDatas = rawData.map((row) => ({
  id: generateId(row[0]),
  name: generateName(row[0]),
  region: extractRegion(row[0]),
  location: extractLocation(row[0]),
  seName: row[1] || null,
  priceCluster: row[2] || null,
  saCount: row[3],
  operationalHours: row[4],
  operationalYear: parseYear(row[5]),
  targetSpd: parseTarget(row[6]),
}));

const seedData = async () => {
  console.log(`Memulai proses seeding ${storeDatas.length} stores...\n`);

  try {
    const seededPassword = "password123";
    const dateNow = new Date();
    const hashedPassword = await hashPassword(seededPassword);

    // 1. BATCH INSERT STORES
    console.log("Seeding Stores...");
    for (const s of storeDatas) {
      await db.insert(store).values({
        id: s.id,
        name: s.name,
        type: "Bright Store",
        region: s.region,
        location: s.location,
        seName: s.seName,
        saCount: s.saCount,
        operationalYear: s.operationalYear,
        operationalHours: s.operationalHours,
        priceCluster: s.priceCluster,
        targetSpd: s.targetSpd,
      }).onConflictDoNothing();
    }
    console.log(`  ${storeDatas.length} stores selesai.`);

    // 2. BATCH INSERT USERS & ACCOUNTS
    console.log("\nSeeding Users...");
    for (const s of storeDatas) {
      const userId = `usr_${s.id.replace("store_", "")}`;
      const storeSuffix = s.id.replace("store_", "");
      const properEmail = storeSuffix.replace(/_/g, "") + "@bright.com";

      await db.insert(users).values({
        id: userId,
        name: s.name,
        email: properEmail,
        emailVerified: true,
        role: "kasir",
        storeId: s.id,
        createdAt: dateNow,
        updatedAt: dateNow,
      }).onConflictDoNothing();

      await db.insert(account).values({
        id: `acc_${userId}`,
        accountId: properEmail,
        providerId: "credential",
        userId,
        password: hashedPassword,
        createdAt: dateNow,
        updatedAt: dateNow,
      }).onConflictDoNothing();
    }
    console.log(`  ${storeDatas.length} kasir selesai.`);

    // 3. SEED ADMIN
    console.log("\nSeeding Admin...");
    await db.insert(users).values({
      id: "usr_admin",
      name: "Super Admin",
      email: "admin@bright.com",
      emailVerified: true,
      role: "admin",
      storeId: null,
      createdAt: dateNow,
      updatedAt: dateNow,
    }).onConflictDoNothing();

    await db.insert(account).values({
      id: "acc_usr_admin",
      accountId: "admin@bright.com",
      providerId: "credential",
      userId: "usr_admin",
      password: hashedPassword,
      createdAt: dateNow,
      updatedAt: dateNow,
    }).onConflictDoNothing();
    console.log("  Admin selesai.");

    console.log(`\nSelesai! ${storeDatas.length} stores + kasir + admin.`);
    console.log(`\nLogin: admin@bright.com / ${seededPassword}`);
  } catch (error) {
    console.error("Gagal seeding:", error);
  }
};

seedData();
