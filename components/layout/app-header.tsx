"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Loader2, Bell, CheckCircle, AlertCircle } from "lucide-react";
import Image from "next/image";
import Logo from "@/public/Logo_pertamina.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getInitials(nameOrEmail: string | undefined): string {
  if (!nameOrEmail) return "U";
  const clean = nameOrEmail.trim();
  if (!clean) return "U";
  if (clean.includes("@")) return clean[0]?.toUpperCase() ?? "U";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

interface AppHeaderProps {
  session: any;
  isSigningOut: boolean;
  onLogout: () => void;
}

export function AppHeader({ session, isSigningOut, onLogout }: AppHeaderProps) {
  const [time, setTime] = useState<string>("");
  const [reportSubmitted, setReportSubmitted] = useState<boolean | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setTime(now.toLocaleDateString("en-US", options));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function checkReport() {
      try {
        const res = await fetch("/api/reports");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          setReportSubmitted(data.submitted);
          setStoreName(data.storeName);
        }
      } catch {
        // silently ignore
      }
    }
    checkReport();
    return () => { mounted = false; };
  }, []);

  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background/95 backdrop-blur p-2">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* --- Kiri: Logo & Branding --- */}
        <div className="flex items-center gap-2">
          <div className="relative w-24 h-8 md:w-32 md:h-10 shrink-0">
            <Image
              src={Logo}
              alt="Logo Pertamina Retail"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-sm md:text-lg font-bold text-foreground hidden sm:block truncate">
            Sales Daily Report
          </h1>
        </div>

        {/* --- Tengah/Kanan: Real-time Clock --- */}
        <div className="hidden lg:block flex-1 text-right px-8">
          <p className="text-sm font-semibold text-muted-foreground">{time}</p>
        </div>

        {/* --- Kanan: Actions & Profile --- */}
        <div className="flex items-center gap-1 md:gap-3 shrink-0">
          <ThemeModeToggle />

          {/* Notification Bell */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative p-2 rounded-full bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {reportSubmitted === false && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {reportSubmitted === null ? (
                <p className="text-xs">Mengecek status laporan...</p>
              ) : reportSubmitted ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <p className="text-xs font-medium">{storeName} sudah submit laporan hari ini</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-xs font-medium">{storeName || "Store"} belum submit laporan hari ini</p>
                </div>
              )}
            </TooltipContent>
          </Tooltip>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2 border-l ml-2">
            <Avatar className="h-9 w-9 border-2 border-blue-500">
              <AvatarImage
                src={
                  session?.user?.image ||
                  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(session?.user?.name || "User")}`
                }
                alt={session?.user?.name ?? "User"}
              />
              <AvatarFallback className="bg-blue-600 text-white font-bold">
                {getInitials(session?.user?.name ?? session?.user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-sm font-bold text-foreground">
                {session?.user?.name ?? "Admin User"}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            disabled={isSigningOut}
            className="text-muted-foreground hover:text-red-600"
          >
            {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {!isSigningOut && (
              <span className="text-[10px] font-bold">OUT</span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
