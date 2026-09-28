'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface InspectionTrendItem {
  date: string | Date;
  conditionScore: number;
  inspectorName?: string;
  type?: string;
}

interface ConditionChartProps {
  inspections: InspectionTrendItem[];
}

export function ConditionChart({ inspections = [] }: ConditionChartProps) {
  if (!inspections || inspections.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
        No past inspection history to chart.
      </div>
    );
  }

  // Sort chronologically ascending for the line chart
  const data = [...inspections]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      score: item.conditionScore,
      type: item.type,
      inspector: item.inspectorName,
    }));

  return (
    <div className="w-full h-56 bg-white p-3 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Condition Score Rating Trend (1 to 5)
        </h5>
        <span className="text-[10px] text-slate-400">5 = Very Good · 1 = Critical</span>
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-slate-900 text-white p-2 rounded-lg text-xs shadow-lg space-y-0.5">
                    <p className="font-bold text-emerald-400">Rating: {item.score}/5</p>
                    <p className="text-slate-300">{item.type} ({label})</p>
                    {item.inspector && <p className="text-[10px] text-slate-400">By: {item.inspector}</p>}
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine y={2} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Poor', fill: '#f97316', fontSize: 10 }} />
          <ReferenceLine y={4} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Good', fill: '#22c55e', fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#059669"
            strokeWidth={3}
            dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
