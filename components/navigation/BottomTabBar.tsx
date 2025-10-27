'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Sprout, User, Users, ClipboardCheck, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const tabs = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Plants',
    href: '/plants',
    icon: Sprout,
  },
  {
    name: 'Chores',
    href: '/chores',
    icon: ClipboardCheck,
  },
];

const accountMenuItems = [
  {
    name: 'Groups',
    href: '/groups',
    icon: Users,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const isAccountActive = accountMenuItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 max-w-[95vw] w-auto">
      <div className="flex gap-2 rounded-3xl bg-card-bg/95 p-2 pl-safe pr-safe shadow-2xl backdrop-blur-xl border-2 border-sage">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-3 transition-all ${
                isActive
                  ? 'bg-terracotta text-white'
                  : 'text-soil hover:bg-sage/20 hover:text-moss-dark'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span className="text-xs font-medium">{tab.name}</span>
            </Link>
          );
        })}

        {/* Account Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-4 py-3 transition-all outline-none ${
              isAccountActive
                ? 'bg-terracotta text-white'
                : 'text-soil hover:bg-sage/20 hover:text-moss-dark'
            }`}
          >
            <MoreVertical className="h-5 w-5" strokeWidth={2} />
            <span className="text-xs font-medium">Account</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={8}>
            {accountMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <DropdownMenuItem
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={isActive ? 'bg-sage/30 text-moss-dark font-medium' : ''}
                >
                  <Icon className="h-5 w-5 mr-3" strokeWidth={2} />
                  <span className="font-medium">{item.name}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
