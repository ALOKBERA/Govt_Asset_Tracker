import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white text-xs py-1.5 px-4 font-medium flex items-center justify-between shadow-sm z-50">
      <div className="flex items-center space-x-2 mx-auto sm:mx-0">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-200 shrink-0" />
        <span>
          <strong className="font-semibold uppercase tracking-wider">Demo / Hackathon Prototype:</strong> Roads and Buildings Department, Government of Gujarat. Data shown is illustrative.
        </span>
      </div>
      <div className="hidden sm:flex items-center space-x-2 text-[11px] text-amber-100">
        <span>RNB AssetTrail v1.0</span>
      </div>
    </div>
  );
}
