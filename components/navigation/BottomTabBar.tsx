'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sprout, User, Users, ClipboardCheck } from 'lucide-react';

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

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex gap-2 rounded-3xl bg-card-bg/95 p-2 shadow-2xl backdrop-blur-xl border-2 border-sage">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-6 py-3 transition-all ${
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
      </div>
    </nav>
  );
}
