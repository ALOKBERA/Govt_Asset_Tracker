'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  PieChart,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatChainage } from '@/lib/chainage';

export default function PlanningPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/planning')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-slate-400 text-xs font-medium">
          Loading planning models, risk matrices, and multi-year budget forecasts...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900">Capital Planning & Lifecycle Backlog</h1>
              <Badge variant="success" className="font-bold text-xs">
                Budget Forecasting Engine
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Explainable formulas · Road Renewal Priority · Bridge Structural Risk · Multi-Year Capex Forecasts
            </p>
          </div>
        </div>

        {/* 4 Summary Budget Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm p-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Immediate Repair Backlog</span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatCurrency(data.backlog?.totalCost || 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {data.backlog?.items?.length || 0} inspection recommendations
            </p>
          </Card>

          <Card className="border-slate-200 shadow-sm p-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Year 1 Renewal Need</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {formatCurrency(data.renewalForecast?.year1?.estimatedCost || 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {data.renewalForecast?.year1?.count || 0} segments ({data.renewalForecast?.year1?.totalKm?.toFixed(1) || 0} km)
            </p>
          </Card>

          <Card className="border-slate-200 shadow-sm p-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Year 2 Renewal Need</span>
            <p className="text-2xl font-black text-teal-700 mt-1">
              {formatCurrency(data.renewalForecast?.year2?.estimatedCost || 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {data.renewalForecast?.year2?.count || 0} segments ({data.renewalForecast?.year2?.totalKm?.toFixed(1) || 0} km)
            </p>
          </Card>

          <Card className="border-slate-200 shadow-sm p-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Year 3 Renewal Need</span>
            <p className="text-2xl font-black text-slate-700 mt-1">
              {formatCurrency(data.renewalForecast?.year3?.estimatedCost || 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {data.renewalForecast?.year3?.count || 0} segments ({data.renewalForecast?.year3?.totalKm?.toFixed(1) || 0} km)
            </p>
          </Card>
        </div>

        {/* Tabbed Views */}
        <Tabs defaultValue="roads" className="space-y-4">
          <TabsList className="bg-slate-100/90 border border-slate-200">
            <TabsTrigger value="roads">Road Renewal Priorities ({data.roadPriorities?.length || 0})</TabsTrigger>
            <TabsTrigger value="bridges">Bridge Safety Watchlist ({data.bridgeWatchlist?.length || 0})</TabsTrigger>
            <TabsTrigger value="backlog">Backlog & Recommendations</TabsTrigger>
            <TabsTrigger value="forecast">1-3 Year Renewal Forecast</TabsTrigger>
          </TabsList>

          {/* TAB 1: Road Renewal Priorities */}
          <TabsContent value="roads">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Priority Rank</th>
                      <th className="py-3 px-4">Asset ID</th>
                      <th className="py-3 px-4">Segment Name</th>
                      <th className="py-3 px-4">Route & Chainage</th>
                      <th className="py-3 px-4">Division</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4">Next Renewal Due</th>
                      <th className="py-3 px-4">Priority Score</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.roadPriorities?.map((r: any, idx: number) => (
                      <tr key={r._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <Link href={`/assets/${r.assetId}`} className="hover:text-emerald-600">
                            {r.assetId}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{r.name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {r.linear?.routeCode} · Km {formatChainage(r.linear?.startChainageM)} - {formatChainage(r.linear?.endChainageM)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{(r.divisionId as any)?.name || 'Division'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] text-white font-bold ${
                              r.conditionScore <= 1
                                ? 'bg-rose-600'
                                : r.conditionScore <= 2
                                ? 'bg-orange-500'
                                : r.conditionScore <= 3
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                          >
                            {r.condition || 'Score ' + r.conditionScore}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(r.nextRenewalDue)}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-800 text-sm">
                          {r.priorityScore || 0}/100
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/works?newFor=${r._id}`}>
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 font-bold">
                              Sanction Resurfacing
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: Bridge Safety Watchlist */}
          <TabsContent value="bridges">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Watchlist Rank</th>
                      <th className="py-3 px-4">Asset ID</th>
                      <th className="py-3 px-4">Bridge Title</th>
                      <th className="py-3 px-4">Obstacle</th>
                      <th className="py-3 px-4">Division</th>
                      <th className="py-3 px-4">Operational Status</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4">Risk Rating</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.bridgeWatchlist?.map((b: any, idx: number) => (
                      <tr key={b._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <Link href={`/assets/${b.assetId}`} className="hover:text-emerald-600">
                            {b.assetId}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{b.name}</td>
                        <td className="py-3 px-4 text-slate-600">{(b.attributes as any)?.riverObstacle || 'River'}</td>
                        <td className="py-3 px-4 text-slate-600">{(b.divisionId as any)?.name || 'Division'}</td>
                        <td className="py-3 px-4">
                          <Badge variant={b.operationalStatus === 'OPEN' ? 'success' : 'destructive'}>
                            {b.operationalStatus || 'OPEN'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] text-white font-bold ${
                              b.conditionScore <= 1
                                ? 'bg-rose-600'
                                : b.conditionScore <= 2
                                ? 'bg-orange-500'
                                : b.conditionScore <= 3
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                          >
                            Score {b.conditionScore}/5
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-rose-700 text-sm">
                          {b.riskScore || 0}/100
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/assets/${b.assetId}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs font-semibold">
                              Inspect / Restrict
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: Backlog */}
          <TabsContent value="backlog">
            <Card className="border-slate-200 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Maintenance Backlog Breakdown by Action</h3>
                <p className="text-[11px] text-slate-500">
                  Aggregated from physical defect recommendations across field inspections
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {data.backlog?.byAction &&
                  Object.keys(data.backlog.byAction).map((act) => (
                    <div key={act} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400">{act.replace('_', ' ')}</span>
                      <p className="text-lg font-black text-slate-900 mt-1">
                        {formatCurrency(data.backlog.byAction[act].totalCost)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {data.backlog.byAction[act].count} recommended work(s)
                      </p>
                    </div>
                  ))}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: 1-3 Year Renewal Forecast */}
          <TabsContent value="forecast">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">Year 1 Renewals (Immediate)</h4>
                  <Badge variant="warning">{data.renewalForecast?.year1?.count || 0} Links</Badge>
                </div>
                <p className="text-2xl font-black text-emerald-800">
                  {formatCurrency(data.renewalForecast?.year1?.estimatedCost || 0)}
                </p>
                <p className="text-xs text-slate-500">
                  Target Length: <strong>{data.renewalForecast?.year1?.totalKm?.toFixed(1)} km</strong>
                </p>
              </Card>

              <Card className="border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">Year 2 Renewals</h4>
                  <Badge variant="secondary">{data.renewalForecast?.year2?.count || 0} Links</Badge>
                </div>
                <p className="text-2xl font-black text-teal-800">
                  {formatCurrency(data.renewalForecast?.year2?.estimatedCost || 0)}
                </p>
                <p className="text-xs text-slate-500">
                  Target Length: <strong>{data.renewalForecast?.year2?.totalKm?.toFixed(1)} km</strong>
                </p>
              </Card>

              <Card className="border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">Year 3 Renewals</h4>
                  <Badge variant="secondary">{data.renewalForecast?.year3?.count || 0} Links</Badge>
                </div>
                <p className="text-2xl font-black text-slate-800">
                  {formatCurrency(data.renewalForecast?.year3?.estimatedCost || 0)}
                </p>
                <p className="text-xs text-slate-500">
                  Target Length: <strong>{data.renewalForecast?.year3?.totalKm?.toFixed(1)} km</strong>
                </p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
