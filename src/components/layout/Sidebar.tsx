'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  ClipboardCheck,
  Hammer,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Assets', href: '/assets', icon: Boxes },
  { name: 'Inspections', href: '/inspections', icon: ClipboardCheck },
  { name: 'Works & DLP', href: '/works', icon: Hammer },
  { name: 'Approvals', href: '/approvals', icon: CheckCircle2 },
  { name: 'Planning', href: '/planning', icon: TrendingUp },
  { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-30 pt-[calc(4rem+28px)] bg-slate-900 text-slate-200 border-r border-slate-800">
        <div className="flex-1 flex flex-col justify-between overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Department Operations
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-slate-400')} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Bottom links */}
          <div className="pt-4 border-t border-slate-800 space-y-1">
            <Link
              href="/settings"
              className={cn(
                'flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs font-medium transition-all',
                pathname === '/settings'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Settings</span>
            </Link>

            <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 mt-2">
              <div className="flex items-center space-x-2 text-[11px] font-semibold text-emerald-400">
                <QrCode className="h-3.5 w-3.5" />
                <span>Field QR Tagging</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                Scan QR on asset physically to inspect or verify.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex justify-around shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center p-1.5 rounded-md text-[10px] font-medium transition-colors',
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="truncate max-w-[60px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
