'use client';

import React from 'react';
import Link from 'next/link';
import { formatChainage } from '@/lib/chainage';
import { CONDITION_COLORS, ConditionBand } from '@/lib/constants';

interface SegmentItem {
  _id: string;
  assetId: string;
  name: string;
  linear?: {
    startChainageM?: number;
    endChainageM?: number;
    lengthM?: number;
    routeCode?: string;
  };
  condition?: string;
  conditionScore?: number;
  status: string;
}

interface SegmentStripProps {
  segments: SegmentItem[];
  totalRoadLengthM?: number;
  selectedSegmentId?: string;
  onSelectSegment?: (seg: SegmentItem) => void;
}

export function SegmentStrip({
  segments = [],
  totalRoadLengthM,
  selectedSegmentId,
  onSelectSegment,
}: SegmentStripProps) {
  if (!segments || segments.length === 0) {
    return (
      <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500">
        No road segments registered for this route link. Add segments to visualize chainage strip.
      </div>
    );
  }

  // Sort segments by start chainage
  const sorted = [...segments].sort(
    (a, b) => (a.linear?.startChainageM ?? 0) - (b.linear?.startChainageM ?? 0)
  );

  const maxChainage =
    totalRoadLengthM ||
    sorted.reduce((max, s) => Math.max(max, s.linear?.endChainageM ?? 0), 0) ||
    10000;

  const getSegmentColor = (seg: SegmentItem) => {
    if (seg.status === 'CLOSED') return '#ef4444'; // Red
    const score = seg.conditionScore ?? 3;
    if (score <= 1) return '#ef4444'; // Critical
    if (score <= 2) return '#f97316'; // Poor
    if (score <= 3) return '#eab308'; // Fair
    if (score <= 4) return '#22c55e'; // Good
    return '#16a34a'; // Very Good
  };

  return (
    <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Road Chainage Segment Strip (Linear Condition Visualization)
          </h4>
          <p className="text-[11px] text-slate-500">
            Horizontal visualization of surface condition across route length (0+000 to {formatChainage(maxChainage)})
          </p>
        </div>

        <div className="flex items-center space-x-2 text-[10px]">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Good (4-5)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Fair (3)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Poor (2)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>Critical / Closed (1)</span>
          </span>
        </div>
      </div>

      {/* The Visual Strip */}
      <div className="relative w-full h-10 bg-slate-100 rounded-lg p-1 flex items-center border border-slate-200 overflow-hidden">
        {sorted.map((seg) => {
          const startM = seg.linear?.startChainageM ?? 0;
          const endM = seg.linear?.endChainageM ?? 1000;
          const lengthM = Math.max(100, endM - startM);
          const widthPercent = (lengthM / maxChainage) * 100;
          const color = getSegmentColor(seg);
          const isSelected = selectedSegmentId === seg._id || selectedSegmentId === seg.assetId;

          return (
            <div
              key={seg._id || seg.assetId}
              style={{
                width: `${Math.max(4, widthPercent)}%`,
                backgroundColor: color,
              }}
              onClick={() => onSelectSegment && onSelectSegment(seg)}
              className={`group relative h-full rounded cursor-pointer transition-all hover:brightness-110 flex items-center justify-center border-r border-white/40 ${
                isSelected ? 'ring-2 ring-slate-900 ring-offset-1 scale-[1.02] z-10' : ''
              }`}
              title={`${seg.name} (Km ${formatChainage(startM)} - ${formatChainage(endM)}) · Condition: ${seg.condition || 'Score ' + seg.conditionScore}`}
            >
              <span className="text-[9px] font-bold text-white px-1 truncate opacity-90 group-hover:opacity-100">
                {formatChainage(startM)}
              </span>

              {/* Hover Tooltip Card */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                <div className="bg-slate-900 text-white text-[11px] p-2 rounded-lg shadow-xl whitespace-nowrap space-y-0.5">
                  <p className="font-bold text-emerald-400">{seg.assetId}</p>
                  <p className="font-medium">{seg.name}</p>
                  <p className="text-slate-300">
                    Chainage: Km {formatChainage(startM)} to {formatChainage(endM)} ({(lengthM / 1000).toFixed(2)} km)
                  </p>
                  <p className="text-slate-300">
                    Condition: <span className="font-semibold text-white">{seg.condition || 'Score ' + seg.conditionScore}</span> · Status: {seg.status}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Segment Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
        {sorted.map((seg) => {
          const startM = seg.linear?.startChainageM ?? 0;
          const endM = seg.linear?.endChainageM ?? 0;
          const color = getSegmentColor(seg);

          return (
            <Link
              key={seg._id}
              href={`/assets/${seg.assetId}`}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                  <span className="font-bold text-slate-900">{seg.assetId}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Km {formatChainage(startM)} - {formatChainage(endM)}
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: color }}
              >
                {seg.condition || 'Score ' + seg.conditionScore}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
