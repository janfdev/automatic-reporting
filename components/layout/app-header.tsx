import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeModeToggle } from "@/components/themes/theme-mode-toggle";
import { Loader2, LogOut } from "lucide-react";

// Helper function dipindahkan ke sini agar mandiri
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
  return (
    <header className="bg-background border-b px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 sticky top-0 z-10">
      <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            P
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-sm tracking-widest text-foreground">PERTAMINA</span>
            <span className="text-xs text-red-600 font-semibold tracking-widest">RETAIL</span>
          </div>
        </div>
        <div className="h-10 w-px bg-border hidden md:block mx-2"></div>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-foreground">Sales Daily Report</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Non - Fuel Retail Sales & Operation</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between w-full md:w-auto gap-3 md:gap-4">
        <div className="text-sm text-muted-foreground hidden md:block">Internal Operations System</div>
        
        <div className="flex items-center gap-2 rounded-full border px-2.5 py-1.5 bg-muted/40">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? "User"} />
            <AvatarFallback>{getInitials(session?.user?.name ?? session?.user?.email)}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-xs font-medium text-foreground">{session?.user?.name ?? "User"}</span>
            <span className="text-[11px] text-muted-foreground">{session?.user?.email ?? "Memuat..."}</span>
          </div>
        </div>
        
        <ThemeModeToggle />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLogout}
          disabled={isSigningOut}
          className="gap-2"
        >
          {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}