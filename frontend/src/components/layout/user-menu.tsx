'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, LayoutDashboard, LogOut, Package, Store, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authApi } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/i18n';

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const t = useT();
  const router = useRouter();

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/login">{t('nav.signIn')}</Link>
      </Button>
    );
  }

  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  const logout = async () => {
    await authApi.logout();
    toast.success('Signed out');
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-muted" aria-label="Account menu">
          <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user.name[0]?.toUpperCase()
            )}
          </span>
          <span className="hidden max-w-24 truncate text-sm font-medium lg:block">{user.name.split(' ')[0]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p className="font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserIcon /> {t('nav.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package /> {t('nav.orders')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/wishlist">
            <Heart /> {t('nav.wishlist')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={user.role === 'SELLER' ? '/seller' : '/seller/register'}>
            <Store /> {user.role === 'SELLER' ? t('nav.sellerPortal') : t('nav.sellOnSkymap')}
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard /> {t('nav.adminDashboard')}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="text-destructive">
          <LogOut /> {t('nav.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
