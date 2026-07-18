"use client";

import React, { useState } from 'react';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Breadcrumbs } from '../breadcrumbs';
import SearchInput from '../search-input';
import { ThemeSelector } from '../themes/theme-selector';
import { Button } from '../ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';

export default function Header() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const onLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className='bg-background sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2'>
      <div className='flex items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        <Breadcrumbs />
      </div>

      <div className='flex items-center gap-2 px-4'>
        <div className='hidden md:flex'>
          <SearchInput />
        </div>
        <ThemeSelector />
        <Separator orientation='vertical' className='h-4' />
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          disabled={isSigningOut}
          className="h-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 gap-1.5 text-xs"
        >
          {isSigningOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>Logout</span>
        </Button>
      </div>
    </header>
  );
}
