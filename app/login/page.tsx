"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn.email({
        email: email.trim(),
        password
      });

      if (result.error) {
        setError("Email atau kata sandi salah. Silakan coba lagi.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/get-session", {
        method: "GET",
        credentials: "include"
      });
      const sessionPayload = sessionResponse.ok
        ? await sessionResponse.json()
        : null;
      const role = sessionPayload?.user?.role;

      // Role-based redirect
      router.push(
        role === "admin" ? "/admin/dashboard/overview" : "/input-data"
      );
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col xl:flex-row">
      {/* ─── Left Panel: Branding ─── */}
      <div
        className="relative hidden overflow-hidden xl:flex xl:w-1/2 xl:flex-col xl:items-center xl:justify-center"
        style={{
          background:
            "linear-gradient(135deg, #c0392b 0%, #e74c3c 50%, #c0392b 100%)"
        }}
      >
        {/* Background decorative circles */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-125 w-125 rounded-full opacity-10"
          style={{ background: "rgba(255,255,255,0.2)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5"
          style={{ background: "rgba(255,255,255,0.3)" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center text-white px-12">
          {/* Logo */}
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center mb-8 shadow-2xl">
            <span className="text-white font-black text-4xl tracking-tight">
              P
            </span>
          </div>

          <p className="text-white/60 tracking-[0.4em] text-xs font-semibold uppercase mb-2">
            PT Pertamina Retail
          </p>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Sales Daily Report
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-xs">
            Sistem pelaporan operasional internal untuk Non-Fuel Retail
          </p>

          {/* Divider */}
          <div className="w-16 h-0.5 bg-white/30 rounded-full my-8" />

          {/* Stats decorative */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-white/60 text-xs mt-1">Monitoring</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold">Real-time</div>
              <div className="text-white/60 text-xs mt-1">Reporting</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Login Form ─── */}
      <div className="flex w-full flex-1 flex-col items-center justify-center bg-background px-4 py-8 sm:px-6 md:px-10 lg:px-12 xl:w-1/2 xl:px-16">
        <div className="w-full max-w-sm sm:max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 xl:hidden">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg"
              style={{
                background: "linear-gradient(135deg, #c0392b, #e74c3c)"
              }}
            >
              P
            </div>
            <div>
              <div className="font-bold text-sm tracking-widest text-foreground">
                PERTAMINA
              </div>
              <div className="text-xs text-red-600 font-semibold tracking-widest">
                RETAIL
              </div>
            </div>
          </div>

          {/* Tablet branding strip */}
          <div className="mb-6 hidden rounded-2xl border border-red-100 bg-red-50/70 p-4 text-sm text-red-800 md:block xl:hidden">
            <p className="font-semibold tracking-wide">Sales Daily Report</p>
            <p className="mt-1 text-xs text-red-700/90">
              Sistem pelaporan internal Non-Fuel Retail yang dioptimalkan untuk
              kasir dan admin.
            </p>
          </div>

          {/* Heading */}
          <div className="mb-7 sm:mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Selamat datang 👋
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground sm:text-[15px]">
              Masuk ke akun kasir Anda untuk melanjutkan
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 mb-6 text-sm animate-in fade-in slide-in-from-top-1 duration-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Masukkan email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={isLoading}
                className="h-11 sm:h-12"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="h-11 pr-11 sm:h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading}
              className="w-full h-11 font-semibold mt-2"
              style={{
                background: isLoading
                  ? undefined
                  : "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)",
                border: "none"
              }}
            >
              <LogIn className="w-4 h-4" />
              Masuk
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Hubungi administrator jika tidak bisa masuk
          </p>
        </div>
      </div>
    </div>
  );
}
