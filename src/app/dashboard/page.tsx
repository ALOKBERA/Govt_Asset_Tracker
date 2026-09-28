'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MapContainerWrapper } from '@/components/map/MapContainerWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Road,
  Boxes,
  Building2,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  Check,
  RefreshCw,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CONDITION_COLORS, RISK_COLORS } from '@/lib/constants';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, alertsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/alerts?resolved=false'),
      ]);

      const dashJson = await dashRes.json();
      const alertsJson = await alertsRes.json();

      if (dashJson.success) setData(dashJson.data);
      if (alertsJson.success) setAlerts(alertsJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
    } catch (e) {
      console.error(e);
    }
  };

  const user = session?.user as any;
  const isFieldUser = user?.role === 'FIELD_ENGINEER' || user?.role === 'SUBDIVISION_ENGINEER';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Operations & Asset Intelligence
              </h1>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Welcome, <strong className="text-slate-800">{user?.name || 'Officer'}</strong> ({user?.role?.replace('_', ' ')})
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link href="/assets/new">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold h-9 px-3.5 shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Register Asset
              </Button>
            </Link>
            <Link href="/inspections">
              <Button size="sm" variant="outline" className="text-xs font-semibold h-9 px-3.5">
                <ClipboardCheck className="h-4 w-4 mr-1.5 text-emerald-600" />
                Run Inspection
              </Button>
            </Link>
          </div>
        </div>

        {/* Unratified Safety Action Urgent Alert Banner */}
        {data?.compliance?.safetyClosures > 0 && (
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white p-4 rounded-xl shadow-md flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="h-6 w-6 text-rose-200 shrink-0 animate-bounce" />
              <div>
                <h3 className="text-sm font-bold">
                  {data.compliance.safetyClosures} Asset(s) under Emergency Safety Closure / Restriction
                </h3>
                <p className="text-xs text-rose-100">
                  Immediate field actions awaiting Executive Engineer review and formal ratification.
                </p>
              </div>
            </div>
            <Link href="/approvals">
              <Button size="sm" variant="secondary" className="bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold shrink-0">
                Review Closures
              </Button>
            </Link>
          </div>
        )}

        {/* Top 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Assets</span>
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Boxes className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900">{data?.counts?.totalAssets || 0}</span>
                <span className="text-xs text-slate-400 font-medium">registered</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {data?.counts?.roads || 0} Roads · {data?.counts?.bridges || 0} Bridges · {data?.counts?.buildings || 0} Buildings
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Road Network</span>
                <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900">{data?.roadStats?.totalRoadLengthKm || 0}</span>
                <span className="text-xs text-slate-400 font-medium">km length</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                SH: {data?.roadStats?.byCategory?.SH?.toFixed(0) || 0} km · MDR: {data?.roadStats?.byCategory?.MDR?.toFixed(0) || 0} km
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bridge Safety Watchlist</span>
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-black text-amber-600">{data?.bridgeStats?.severe || 0}</span>
                <span className="text-xs text-slate-400 font-medium">severe risk ({data?.bridgeStats?.high || 0} high)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Pre/post monsoon surveillance active
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inspection Compliance</span>
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900">{data?.compliance?.inspectionCompliancePercent || 0}%</span>
                <span className="text-xs text-rose-600 font-semibold">{data?.compliance?.overdueInspections || 0} overdue</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {data?.compliance?.pendingApprovals || 0} pending maker-checker approvals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* GIS Interactive Map Preview */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <span>State Infrastructure GIS Map (Gujarat Asset Network)</span>
              </CardTitle>
              <p className="text-[11px] text-slate-500">
                Colored polylines (Roads by condition: Green Good, Orange Poor, Red Critical) · Pins (Bridges & Buildings)
              </p>
            </div>
            <Link href="/assets?view=map">
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold">
                Full Map View
              </Button>
            </Link>
          </CardHeader>
          <div className="p-2 bg-slate-100">
            <MapContainerWrapper assets={data?.mapAssets || []} height="380px" />
          </div>
        </Card>

        {/* Watchlists & Priorities 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bridge Safety Watchlist (Top 5) */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Bridge Safety Watchlist (High Priority)</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Ranked by structural risk score (condition, age, scour, load limit)
                </p>
              </div>
              <Link href="/planning">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-slate-100">
              {data?.bridgeWatchlist?.slice(0, 5).map((b: any) => (
                <Link
                  key={b._id}
                  href={`/assets/${b.assetId}`}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors block text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900">{b.assetId}</span>
                      <Badge
                        variant={b.riskScore >= 75 ? 'critical' : b.riskScore >= 50 ? 'warning' : 'info'}
                      >
                        Risk {b.riskScore || 0}/100
                      </Badge>
                      {b.operationalStatus !== 'OPEN' && (
                        <span className="text-[10px] font-bold bg-rose-600 text-white px-1.5 py-0.2 rounded">
                          {b.operationalStatus}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800">{b.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Division: {b.divisionId?.name || 'Division'} · Condition: {b.condition || 'Score ' + b.conditionScore}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Road Segment Priority List (Top 5) */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>Road Priority List (Renewal Backlog)</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Ranked by renewal urgency, traffic class, and surface distress
                </p>
              </div>
              <Link href="/planning">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-slate-100">
              {data?.roadPriorityList?.slice(0, 5).map((r: any) => (
                <Link
                  key={r._id}
                  href={`/assets/${r.assetId}`}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors block text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900">{r.assetId}</span>
                      <Badge variant="warning">Priority {r.priorityScore || 0}/100</Badge>
                      <span className="text-[10px] text-slate-400 font-semibold">{r.linear?.routeCode || 'SH'}</span>
                    </div>
                    <p className="font-semibold text-slate-800">{r.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Length: {((r.linear?.lengthM || 0) / 1000).toFixed(2)} km · Condition: {r.condition || 'Score ' + r.conditionScore}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Active System Alerts Section */}
        <div id="alerts">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Active Department Notifications & Alerts ({alerts.length})</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500">
                  Auto-scanned alerts: DLP expiries, overdue inspections, unratified closures, compliance expiries
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">
                  No active unresolved alerts for your jurisdiction.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert._id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between space-x-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="warning" className="text-[10px] uppercase font-bold">
                            {alert.type?.replace(/_/g, ' ')}
                          </Badge>
                          {alert.assetCode && (
                            <Link href={`/assets/${alert.assetCode}`} className="font-mono font-bold text-slate-900 hover:underline">
                              {alert.assetCode}
                            </Link>
                          )}
                        </div>
                        <p className="text-slate-700 font-medium">{alert.message}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(alert.createdAt)}</p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveAlert(alert._id)}
                        className="h-7 text-[11px] px-2.5 shrink-0 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                        title="Mark alert as acknowledged and resolved"
                      >
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        Resolve
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
