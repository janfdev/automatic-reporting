/**
 * Menghapus semua karakter non-digit dan mengubahnya menjadi number.
 * Berguna untuk membersihkan input dengan separator ribuan sebelum disimpan ke state/DB.
 */
export const parseNumberInput = (value: string): number => {
  return parseInt(value.replace(/\D/g, ""), 10) || 0;
};

/**
 * Memformat angka menjadi format ribuan Rupiah untuk tampilan input.
 * Contoh: 1000000 -> "1.000.000"
 */
export const formatRupiahInput = (value: number | string): string => {
  if (!value) return "";
  const numberString = value.toString().replace(/\D/g, "");
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * Memformat angka menjadi format mata uang Rupiah lengkap (Rp).
 */
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Memastikan input hanya berisi huruf, angka, dan spasi.
 */
export const alphaNumericSpaceOnly = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9\s]/g, "");
};
