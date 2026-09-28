'use client';

import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { DemoBanner } from './DemoBanner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <DemoBanner />
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 md:pl-60 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
