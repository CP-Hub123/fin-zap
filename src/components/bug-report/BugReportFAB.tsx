import { useState } from 'react';
import { Bug } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BugReportModal } from './BugReportModal';
import { cn } from '@/lib/utils';

export const BugReportFAB = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Hide on auth/landing/admin (admin has its own surface)
  if (!user) return null;
  if (pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/admin') || pathname.startsWith('/maintenance')) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Reportar problema"
        className={cn(
          'fixed z-40 right-4 bottom-[calc(env(safe-area-inset-bottom,0)+1rem)] sm:bottom-4',
          'h-10 w-10 rounded-full',
          'bg-background/70 backdrop-blur-md border border-border/60',
          'text-muted-foreground hover:text-foreground',
          'shadow-card hover:shadow-elevated',
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'opacity-70 hover:opacity-100',
        )}
      >
        <Bug className="h-4 w-4" />
      </button>
      <BugReportModal open={open} onOpenChange={setOpen} />
    </>
  );
};