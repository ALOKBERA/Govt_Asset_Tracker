'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Layers } from 'lucide-react';

const DynamicLeafletMap = dynamic(
  () => import('./LeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center space-x-2">
          <Layers className="h-5 w-5 animate-spin text-emerald-600" />
          <span>Loading GIS Map...</span>
        </div>
      </div>
    ),
  }
);

export function MapContainerWrapper(props: any) {
  return <DynamicLeafletMap {...props} />;
}

export default MapContainerWrapper;
