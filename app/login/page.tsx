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
        password,
      });

      if (result.error) {
        setError("Email atau kata sandi salah. Silakan coba lagi.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/get-session", {
        method: "GET",
        credentials: "include",
      });
      const sessionPayload = sessionResponse.ok
        ? await sessionResponse.json()
        : null;
      const role = sessionPayload?.user?.role;

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F9F9] p-4 text-[#333]">
      
      {/* Kartu Login */}
      <div className="w-full max-w-[420px] bg-white rounded-lg border border-[#e5e5e5] shadow-sm p-8">
        
        {/* Header Logo & Slogan */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative w-40 h-12 mb-4">
            <Image 
              src="/logo-pertamina-retail.png" 
              alt="Pertamina Retail Logo" 
              fill 
              className="object-contain" 
              priority 
            />
          </div>
          <h2 className="font-bold text-base text-[#333] mb-1">
            Bright by Pertamina
          </h2>
          <p className="text-sm text-[#666]">Login with your Account</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded px-3 py-2 mb-4 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-[#333]">Email</Label>
            <Input
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded border-[#ccc] focus:border-[#E31D2B] focus:ring-1 focus:ring-[#E31D2B]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-sm font-semibold text-[#333]">Password</Label>
              
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded border-[#ccc] focus:border-[#E31D2B] focus:ring-1 focus:ring-[#E31D2B]"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-2.5 text-gray-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Tombol Login */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 rounded font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#f01322" }}
          >
            {isLoading ? "Loading..." : "Login"}
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