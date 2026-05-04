"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Loader2, Bell } from "lucide-react";
import Image from "next/image";
import Logo from "@/public/Logo_pertamina.png"

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

  // Hook untuk jam real-time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      setTime(now.toLocaleDateString('en-US', options));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background/95 backdrop-blur p-2">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* --- Kiri: Logo & Branding --- */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
             {/* Ganti src dengan path logo Pertamina Retail Anda */}
            <div className="relative w-[130px] h-[130px]">
               <Image
                  src={Logo}
                  alt="Logo Pertamina Retail"
                  fill
                  className="object-contain"
                  priority
                />
            </div>
          </div>
          <h1 className="text-lg font-bold text-[#1e293b] hidden sm:block">
            Sales Daily Report
          </h1>
        </div>

        {/* --- Tengah/Kanan: Real-time Clock --- */}
        <div className="hidden lg:block flex-1 text-right px-8">
          <p className="text-sm font-semibold text-gray-700">
            {time}
          </p>
        </div>
        
        {/* --- Kanan: Actions & Profile --- */}
        <div className="flex items-center gap-3">
          
          {/* Theme Toggle */}
          <ThemeModeToggle />

          {/* Notification Icon */}
          <div className="relative p-2 rounded-full bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2 border-l ml-2">
            <Avatar className="h-9 w-9 border-2 border-blue-500">
              <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? "User"} />
              <AvatarFallback className="bg-blue-600 text-white font-bold">
                {getInitials(session?.user?.name ?? session?.user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-sm font-bold text-gray-800">
                {session?.user?.name ?? "Admin User"}
              </span>
            </div>
          </div>

          {/* Logout (Optional, if you want to keep it visible) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            disabled={isSigningOut}
            className="text-gray-500 hover:text-red-600"
          >
            {isSigningOut ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {!isSigningOut && <span className="text-[10px] font-bold">OUT</span>}
          </Button>
        </div>

      </div>
    </header>
  );
}