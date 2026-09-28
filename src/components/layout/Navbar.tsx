'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  Bell,
  LogOut,
  User,
  Shield,
  Layers,
  Search,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  onRefreshAlerts?: () => void;
  activeAlertsCount?: number;
}

export function Navbar({ onRefreshAlerts, activeAlertsCount = 0 }: NavbarProps) {
  const { data: session } = useSession();
  const [lang, setLang] = useState<'EN' | 'GU'>('EN');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/alerts', { method: 'POST' });
      if (onRefreshAlerts) onRefreshAlerts();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  const user = session?.user as any;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left Branding */}
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 text-base leading-tight tracking-tight">
                  RNB AssetTrail
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded border border-emerald-300">
                  GUJARAT
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">
                Roads & Buildings Department
              </p>
            </div>
          </Link>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Refresh Alerts Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="hidden md:flex items-center space-x-1.5 text-xs text-slate-700 h-8 px-2.5"
            title="Scan and refresh alerts engine"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Alerts</span>
          </Button>

          {/* Alert Notifications Link */}
          <Link href="/dashboard#alerts">
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg text-slate-600 hover:text-slate-900">
              <Bell className="h-4 w-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                  {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Language Switch */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === 'EN' ? 'GU' : 'EN')}
            className="h-8 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Globe className="h-3.5 w-3.5 mr-1 text-slate-500" />
            <span>{lang === 'EN' ? 'ગુજરાતી' : 'English'}</span>
          </Button>

          {/* User Info & Role Chip */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</p>
                <div className="flex items-center justify-end space-x-1">
                  <Shield className="h-2.5 w-2.5 text-emerald-600" />
                  <span className="text-[10px] text-slate-500 font-medium">
                    {user.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="h-8 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
