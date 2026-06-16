import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/app/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarFooter, SidebarHeader,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard, Users, Bug, CreditCard, BookOpen, Settings, ArrowLeft, Search, Bell, LogOut, BellRing,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/admin/users', label: 'Usuários', icon: Users },
  { path: '/admin/bugs', label: 'Bugs', icon: Bug },
  { path: '/admin/subscriptions', label: 'Assinaturas', icon: CreditCard },
  { path: '/admin/tutorials', label: 'Tutoriais', icon: BookOpen },
  { path: '/admin/notifications', label: 'Notificações', icon: BellRing },
  { path: '/admin/settings', label: 'Configurações', icon: Settings },
];

const AdminSidebar = () => {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b h-14 px-4 flex flex-row items-center gap-2">
        <Logo size="small" />
        <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase group-data-[collapsible=icon]:hidden">
          Admin
        </span>
      </SidebarHeader>
      <SidebarContent className="py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => {
                const active = item.end ? pathname === item.path : pathname.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <NavLink to={item.path} end={item.end}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3 gap-1">
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <div className="h-7 w-7 rounded-full bg-gradient-zap flex items-center justify-center text-[11px] font-semibold text-primary-foreground">
            {user?.email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.email}</p>
            <p className="text-[10px] text-muted-foreground">Administrador</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
};

const AdminHeader = () => {
  const navigate = useNavigate();
  const { data: status } = useQuery({
    queryKey: ['system-status-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings').select('value').eq('key', 'system_status').single();
      if (error) throw error;
      return data?.value ?? 'active';
    },
  });
  const isMaintenance = status === 'maintenance';

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-background/80 backdrop-blur-md flex items-center gap-3 px-4">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <Button variant="ghost" size="icon" onClick={() => navigate('/app')} className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Voltar ao app">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar..." className="h-9 pl-9 text-sm bg-muted/40 border-transparent focus-visible:bg-background" />
        </div>
      </div>
      <div className="flex-1 md:hidden" />
      <div className="flex items-center gap-2">
        <span className={cn(
          'hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border',
          isMaintenance ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-finzap-green/10 text-[hsl(var(--finzap-green))] border-finzap-green/20'
        )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', isMaintenance ? 'bg-destructive' : 'bg-[hsl(var(--finzap-green))]')} />
          {isMaintenance ? 'Manutenção' : 'Ativo'}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export const AdminLayout = ({ children }: { children: ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);