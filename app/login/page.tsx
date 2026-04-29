"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

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
      router.push(role === "admin" ? "/admin/dashboard/overview" : "/input-data");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ─── Left Panel: Branding ─── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #c0392b 0%, #e74c3c 50%, #c0392b 100%)" }}
      >
        {/* Background decorative circles */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: "rgba(255,255,255,0.15)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "rgba(255,255,255,0.2)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: "rgba(255,255,255,0.3)" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center text-white px-12">
          {/* Logo */}
          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center mb-8 shadow-2xl">
            <span className="text-white font-black text-4xl tracking-tight">P</span>
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
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg"
              style={{ background: "linear-gradient(135deg, #c0392b, #e74c3c)" }}
            >
              P
            </div>
            <div>
              <div className="font-bold text-sm tracking-widest text-foreground">PERTAMINA</div>
              <div className="text-xs text-red-600 font-semibold tracking-widest">RETAIL</div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Selamat datang 👋
            </h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              Masuk ke akun kasir Anda untuk melanjutkan
            </p>
          </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded px-3 py-2 mb-4 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
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
                className="h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
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
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                border: "none",
              }}
            >
              <LogIn className="w-4 h-4" />
              Masuk
            </Button>
          </form>

        {/* Footer Link */}
        <div className="text-center text-sm mt-6">
          <p className="text-[#666]">
            Don't have an account?{" "}
            <button className="text-[#333] font-semibold underline">Sign up</button>
          </p>
        </div>
      </div>

      {/* Footer Kebijakan */}
      <p className="text-center text-xs text-[#666] mt-8 max-w-[400px]">
        By clicking continue, you agree to our{" "}
        <button className="underline">Terms of Service</button> and{" "}
        <button className="underline">Privacy Policy</button>.
      </p>
    </div>
  );
}