'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { MapContainerWrapper } from '@/components/map/MapContainerWrapper';
import { SegmentStrip } from '@/components/assets/SegmentStrip';
import { QRCodeCard } from '@/components/assets/QRCodeCard';
import { ConditionChart } from '@/components/charts/ConditionChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ClipboardCheck,
  Hammer,
  History,
  FileText,
  DollarSign,
  QrCode,
  MapPin,
  ExternalLink,
  Split,
  Plus,
  ArrowRight,
  Printer,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getValidNextTransitions, TransitionRule } from '@/lib/lifecycle';
import { calculateTCO, calculateStraightLineDepreciation } from '@/lib/finance';
import { formatChainage } from '@/lib/chainage';
import type { AssetStatus } from '@/lib/constants';

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [assetData, setAssetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Transition Dialog State
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TransitionRule | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionValue, setTransitionValue] = useState('');
  const [transitionPhoto, setTransitionPhoto] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState('');

  // Integrity Check State
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<any>(null);

  // Split Segment Dialog State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitChainage, setSplitChainage] = useState('');
  const [splitNameA, setSplitNameA] = useState('');
  const [splitNameB, setSplitNameB] = useState('');
  const [splitting, setSplitting] = useState(false);

  const fetchAssetDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/assets/${id}`);
      const json = await res.json();
      if (json.success) {
        setAssetData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetDetails();
  }, [id]);

  const handleVerifyIntegrity = async () => {
    try {
      setVerifyingIntegrity(true);
      const res = await fetch(`/api/assets/${id}/verify-integrity`);
      const json = await res.json();
      if (json.success) {
        setIntegrityResult(json.data.verification);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyingIntegrity(false);
    }
  };

  const handleExecuteTransition = async () => {
    if (!selectedRule) return;
    setTransitioning(true);
    setTransitionError('');

    try {
      const res = await fetch(`/api/assets/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStatus: selectedRule.to,
          reason: transitionReason || selectedRule.description,
          estimatedValue: parseFloat(transitionValue) || undefined,
          photoUrl: transitionPhoto || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Transition failed');

      setIsTransitionModalOpen(false);
      setTransitionReason('');
      setTransitionValue('');
      fetchAssetDetails();
    } catch (err: any) {
      setTransitionError(err.message || 'Transition error');
    } finally {
      setTransitioning(false);
    }
  };

  const handleSplitSegment = async () => {
    setSplitting(true);
    try {
      const res = await fetch(`/api/assets/${id}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'split',
          splitChainageM: parseInt(splitChainage),
          newSegmentNameA: splitNameA,
          newSegmentNameB: splitNameB,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Split failed');

      setIsSplitModalOpen(false);
      router.push('/assets');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSplitting(false);
    }
  };

  if (loading || !assetData) {
    return (
      <AppLayout>
        <div className="p-12 text-center text-slate-400 font-medium text-xs">
          Loading asset details and ledger...
        </div>
      </AppLayout>
    );
  }

  const { asset, childAssets, inspections, works, pendingApprovals, events } = assetData;
  const validTransitions = getValidNextTransitions(asset.classCode, asset.status as AssetStatus);

  // Financial calculations
  const tco = calculateTCO({
    initialCost: asset.acquisition?.cost,
    works: works || [],
    constructionYear: asset.acquisition?.year,
    lengthKm: asset.linear?.lengthM ? asset.linear.lengthM / 1000 : undefined,
  });

  const depreciation = calculateStraightLineDepreciation({
    initialCost: asset.acquisition?.cost,
    constructionOrProcurementYear: asset.acquisition?.year,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Main Asset Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded">
                  {asset.assetId}
                </span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {asset.classCode} · {asset.subType || 'General'}
                </span>
                <Badge
                  variant={
                    asset.status === 'IN_SERVICE'
                      ? 'success'
                      : asset.status === 'RESTRICTED' || asset.status === 'CLOSED' || asset.status === 'UNSAFE'
                      ? 'destructive'
                      : asset.status === 'DEFECT_LIABILITY'
                      ? 'warning'
                      : 'secondary'
                  }
                  className="font-bold text-xs"
                >
                  {asset.status}
                </Badge>
                {asset.operationalStatus && asset.operationalStatus !== 'OPEN' && (
                  <span className="text-xs font-bold bg-rose-600 text-white px-2 py-0.5 rounded">
                    Operational: {asset.operationalStatus}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {asset.name}
              </h1>

              <p className="text-xs text-slate-500 font-medium">
                Division: {(asset.divisionId as any)?.name || 'Division'} · Sub-division: {(asset.subdivisionId as any)?.name || 'Subdivision'} · District: {asset.districtCode}
              </p>
            </div>

            {/* Quick Actions & Next Steps */}
            <div className="flex flex-wrap items-center gap-2">
              {asset.classCode === 'SEG' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSplitChainage(
                      Math.round(((asset.linear?.startChainageM || 0) + (asset.linear?.endChainageM || 5000)) / 2).toString()
                    );
                    setSplitNameA(`${asset.name} (Part 1)`);
                    setSplitNameB(`${asset.name} (Part 2)`);
                    setIsSplitModalOpen(true);
                  }}
                  className="h-9 text-xs"
                >
                  <Split className="h-3.5 w-3.5 mr-1 text-slate-600" />
                  Split Segment
                </Button>
              )}

              <Link href={`/inspections?newFor=${asset._id}`}>
                <Button size="sm" variant="outline" className="h-9 text-xs font-semibold">
                  <ClipboardCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  Inspect
                </Button>
              </Link>

              <Link href={`/assets/${asset.assetId}/label`} target="_blank">
                <Button size="sm" variant="outline" className="h-9 text-xs">
                  <Printer className="h-3.5 w-3.5 mr-1 text-slate-600" />
                  Print Label
                </Button>
              </Link>

              {/* State Machine Transition Trigger */}
              {validTransitions.length > 0 && (
                <div className="relative inline-block">
                  <Button
                    size="sm"
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold shadow-sm"
                    onClick={() => {
                      setSelectedRule(validTransitions[0]);
                      setIsTransitionModalOpen(true);
                    }}
                  >
                    Next Step &rarr;
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Condition Rating</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      asset.conditionScore <= 1 ? '#ef4444' : asset.conditionScore <= 2 ? '#f97316' : asset.conditionScore <= 3 ? '#eab308' : '#22c55e',
                  }}
                ></span>
                <span className="font-bold text-slate-900">{asset.condition || 'Score ' + asset.conditionScore} ({asset.conditionScore}/5)</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {asset.classCode === 'BRG' ? 'Risk Score' : asset.classCode === 'SEG' ? 'Priority Score' : 'Next Inspection'}
              </span>
              <p className="font-bold text-slate-900 mt-0.5">
                {asset.classCode === 'BRG' && asset.riskScore !== null ? (
                  <span className="text-amber-600 font-mono">{asset.riskScore}/100</span>
                ) : asset.classCode === 'SEG' && asset.priorityScore !== null ? (
                  <span className="text-emerald-700 font-mono">{asset.priorityScore}/100</span>
                ) : (
                  formatDate(asset.nextInspectionDue)
                )}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">DLP / Renewal Clock</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {asset.status === 'DEFECT_LIABILITY' && asset.dlpEndDate
                  ? `DLP ends ${formatDate(asset.dlpEndDate)}`
                  : asset.nextRenewalDue
                  ? `Renewal due ${formatDate(asset.nextRenewalDue)}`
                  : 'N/A'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sanctioned Cost</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {formatCurrency(asset.acquisition?.cost)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabbed Detail Views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100/90 border border-slate-200">
            <TabsTrigger value="overview">Overview & Map</TabsTrigger>
            <TabsTrigger value="inspections">Inspections ({inspections.length})</TabsTrigger>
            <TabsTrigger value="works">Works & DLP ({works.length})</TabsTrigger>
            <TabsTrigger value="timeline">Audit Timeline ({events.length})</TabsTrigger>
            <TabsTrigger value="finance">Finance & TCO</TabsTrigger>
            <TabsTrigger value="qr">Tag & Identification</TabsTrigger>
          </TabsList>

          {/* TAB 1: Overview */}
          <TabsContent value="overview" className="space-y-4">
            {/* Road Segment Strip if Road */}
            {asset.classCode === 'RDS' && (
              <SegmentStrip segments={childAssets || []} totalRoadLengthM={asset.linear?.lengthM} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Technical Attributes */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Technical Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    {asset.linear && (
                      <>
                        <div>
                          <span className="text-slate-400 font-medium">Route Code:</span>
                          <p className="font-bold text-slate-800">{asset.linear.routeCode}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Chainage Stretch:</span>
                          <p className="font-bold text-slate-800">
                            Km {formatChainage(asset.linear.startChainageM)} to {formatChainage(asset.linear.endChainageM)} ({(asset.linear.lengthM / 1000).toFixed(2)} km)
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <span className="text-slate-400 font-medium">Construction Year:</span>
                      <p className="font-bold text-slate-800">{asset.acquisition?.year || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Sanction Ref:</span>
                      <p className="font-bold text-slate-800">{asset.acquisition?.sanctionNo || 'N/A'}</p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Scheme:</span>
                      <p className="font-bold text-slate-800">{asset.acquisition?.fundingScheme || 'N/A'}</p>
                    </div>

                    {asset.externalRefs?.ibmsBridgeId && (
                      <div>
                        <span className="text-slate-400 font-medium">IBMS ID:</span>
                        <p className="font-bold text-slate-800">{asset.externalRefs.ibmsBridgeId}</p>
                      </div>
                    )}

                    {asset.attributes &&
                      Object.keys(asset.attributes).map((k) => (
                        <div key={k}>
                          <span className="text-slate-400 font-medium capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                          <p className="font-bold text-slate-800">
                            {typeof asset.attributes[k] === 'boolean'
                              ? asset.attributes[k]
                                ? 'Yes'
                                : 'No'
                              : String(asset.attributes[k])}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* GIS Location Map */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span>GIS Alignment & Location</span>
                  </CardTitle>
                </CardHeader>
                <div className="p-2 bg-slate-50">
                  <MapContainerWrapper singleGeometry={asset.geometry} height="280px" />
                </div>
              </Card>
            </div>

            {/* Child Assets Hierarchy Tree */}
            {childAssets && childAssets.length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Child Asset Structure ({childAssets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {childAssets.map((child: any) => (
                    <Link
                      key={child._id}
                      href={`/assets/${child.assetId}`}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors block text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">{child.assetId}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {child.classCode}
                        </Badge>
                      </div>
                      <p className="font-semibold text-slate-800 line-clamp-1">{child.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Condition: {child.condition || 'Score ' + child.conditionScore} · {child.status}
                      </p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: Inspections */}
          <TabsContent value="inspections" className="space-y-4">
            <ConditionChart inspections={inspections || []} />

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Inspection Logs & Condition Ratings
                </CardTitle>
                <Link href={`/inspections?newFor=${asset._id}`}>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> New Inspection
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-100 text-xs">
                {inspections.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No inspections logged yet.</div>
                ) : (
                  inspections.map((insp: any) => (
                    <div key={insp._id} className="p-4 space-y-2 hover:bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] text-white ${
                              insp.conditionScore <= 1
                                ? 'bg-rose-600'
                                : insp.conditionScore <= 2
                                ? 'bg-orange-500'
                                : insp.conditionScore <= 3
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                          >
                            Score {insp.conditionScore}/5
                          </span>
                          <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                            {insp.type?.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{formatDate(insp.date)}</span>
                      </div>

                      <p className="text-slate-700">
                        Inspected by: <strong className="text-slate-900">{insp.inspectorName}</strong> · Recommended Action: <strong className="text-emerald-700">{insp.recommendedAction}</strong>
                      </p>

                      {insp.remarks && <p className="text-slate-500 italic">"{insp.remarks}"</p>}

                      {/* Logged Defects */}
                      {insp.defects && insp.defects.length > 0 && (
                        <div className="pt-1.5 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            Logged Defects ({insp.defects.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {insp.defects.map((d: any, idx: number) => (
                              <span
                                key={idx}
                                className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium flex items-center space-x-1"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    d.severity === 'CRITICAL' ? 'bg-rose-600' : 'bg-amber-500'
                                  }`}
                                ></span>
                                <span>{d.type}</span>
                                {d.contractorLiable && <strong className="text-amber-800">(Contractor Liable)</strong>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Works */}
          <TabsContent value="works" className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Works Orders & Defect Liability Tracking
                  </CardTitle>
                  <p className="text-[11px] text-slate-500">
                    AA/TS sanction particulars, contractor, progress, and 3-year DLP warranty
                  </p>
                </div>
                <Link href={`/works?newFor=${asset._id}`}>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Sanction Work
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-100 text-xs">
                {works.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No works sanctioned for this asset.</div>
                ) : (
                  works.map((w: any) => (
                    <div key={w._id} className="p-4 space-y-2 hover:bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={w.status === 'COMPLETED' ? 'success' : 'secondary'}>
                            {w.status}
                          </Badge>
                          <span className="font-bold text-slate-900">{w.type?.replace('_', ' ')}</span>
                          {w.contractor && (
                            <span className="text-slate-500 font-medium">· Contractor: {w.contractor}</span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(w.actualCost || w.estimatedCost)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500">
                        <div>
                          <span>AA Ref:</span> <strong className="text-slate-800">{w.aaNo || 'N/A'}</strong>
                        </div>
                        <div>
                          <span>TS Ref:</span> <strong className="text-slate-800">{w.tsNo || 'N/A'}</strong>
                        </div>
                        <div>
                          <span>DLP End Date:</span> <strong className="text-emerald-700">{formatDate(w.dlpEndDate)}</strong>
                        </div>
                        <div>
                          <span>Progress:</span> <strong className="text-slate-800">{w.progressPercent || 0}%</strong>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Timeline & Audit Ledger Integrity */}
          <TabsContent value="timeline" className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Cryptographic Audit Ledger (SHA-256 Hash Chaining)</span>
                  </CardTitle>
                  <p className="text-[11px] text-slate-500">
                    Append-only lifecycle history. Every state change is mathematically linked to the previous event hash.
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleVerifyIntegrity}
                  disabled={verifyingIntegrity}
                  className="h-8 text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  {verifyingIntegrity ? 'Verifying Chain...' : 'Verify History Integrity'}
                </Button>
              </CardHeader>

              {integrityResult && (
                <div
                  className={`m-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                    integrityResult.valid
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {integrityResult.valid ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-rose-600" />
                    )}
                    <span>{integrityResult.message}</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase">
                    Status: {integrityResult.valid ? 'OK (UNBROKEN)' : 'BROKEN'}
                  </span>
                </div>
              )}

              <CardContent className="p-4 space-y-4">
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-6">
                  {events.map((ev: any, index: number) => (
                    <div key={ev._id} className="relative pl-6">
                      <div className="absolute -left-2 top-0.5 h-3.5 w-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-sm"></div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900">{ev.type}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(ev.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-700">{ev.description}</p>
                        <div className="text-[10px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                          <span>By: {ev.userName}</span>
                          <span className="truncate max-w-[200px]" title={ev.hash}>
                            Hash: {ev.hash?.slice(0, 16)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: Finance & Depreciation */}
          <TabsContent value="finance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-slate-200 p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Cost of Ownership</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(tco.totalCostOfOwnership)}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Initial Sanction: {formatCurrency(tco.initialCost)} + Maintenance: {formatCurrency(tco.totalMaintenanceSpend)}
                </p>
              </Card>

              {depreciation && (
                <Card className="border-slate-200 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Analytical Book Value</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(depreciation.currentBookValue)}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Straight-Line Depreciation ({depreciation.annualDepreciationRatePercent}%/yr) · Age: {depreciation.ageYears} yrs
                  </p>
                </Card>
              )}

              {tco.costPerKmPerYear !== undefined && (
                <Card className="border-slate-200 p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Maintenance Cost / Km / Year</span>
                  <p className="text-2xl font-black text-teal-700 mt-1">{formatCurrency(tco.costPerKmPerYear)}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Road efficiency benchmark metric
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* TAB 6: QR Tag Identification */}
          <TabsContent value="qr" className="space-y-4">
            <QRCodeCard
              assetId={asset.assetId}
              name={asset.name}
              classCode={asset.classCode}
              districtCode={asset.districtCode}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* State Machine Lifecycle Transition Modal */}
      <Dialog open={isTransitionModalOpen} onOpenChange={setIsTransitionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lifecycle State Transition</DialogTitle>
            <DialogDescription className="text-xs">
              Execute valid lifecycle change for {asset.assetId} ({asset.classCode}).
            </DialogDescription>
          </DialogHeader>

          {transitionError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-semibold">
              {transitionError}
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700">Select Target State</label>
              <select
                value={selectedRule?.to || ''}
                onChange={(e) => {
                  const rule = validTransitions.find((t) => t.to === e.target.value);
                  if (rule) setSelectedRule(rule);
                }}
                className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:ring-2 focus:ring-emerald-500"
              >
                {validTransitions.map((t) => (
                  <option key={t.to} value={t.to}>
                    {t.label} ({t.to}) {t.requiresApproval ? '★ Requires Approval' : t.isImmediateSafety ? '⚡ Immediate Safety' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedRule?.requiresApproval && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-1 text-[11px]">
                <p className="font-bold flex items-center space-x-1">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Maker-Checker Approval Required</span>
                </p>
                <p>
                  This transition requires formal authorization based on asset value. Requesters cannot approve their own proposal.
                </p>
              </div>
            )}

            {selectedRule?.isImmediateSafety && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 space-y-1 text-[11px]">
                <p className="font-bold flex items-center space-x-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Emergency Safety Action</span>
                </p>
                <p>
                  Will be enforced immediately on the network. Formal EE ratification alert will be generated.
                </p>
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700">Reason / Justification *</label>
              <Input
                placeholder="Reason for state transition"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            {selectedRule?.requiresApproval && (
              <div>
                <label className="font-semibold text-slate-700">Estimated Value (₹)</label>
                <Input
                  type="number"
                  placeholder="Estimated value"
                  value={transitionValue}
                  onChange={(e) => setTransitionValue(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            )}

            {selectedRule?.isImmediateSafety && (
              <div>
                <label className="font-semibold text-slate-700">Photo Evidence URL</label>
                <Input
                  placeholder="https://... photo url"
                  value={transitionPhoto}
                  onChange={(e) => setTransitionPhoto(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsTransitionModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteTransition}
              disabled={transitioning || !transitionReason.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
            >
              {transitioning ? 'Executing...' : selectedRule?.requiresApproval ? 'Submit Approval Request' : 'Confirm Transition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Segment Dialog */}
      <Dialog open={isSplitModalOpen} onOpenChange={setIsSplitModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split Road Segment</DialogTitle>
            <DialogDescription className="text-xs">
              Split {asset.name} at a specified chainage point into two new homogeneous child segments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700">Split Chainage Point (meters)</label>
              <Input
                type="number"
                value={splitChainage}
                onChange={(e) => setSplitChainage(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Name for Part 1</label>
              <Input
                value={splitNameA}
                onChange={(e) => setSplitNameA(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Name for Part 2</label>
              <Input
                value={splitNameB}
                onChange={(e) => setSplitNameB(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsSplitModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSplitSegment}
              disabled={splitting || !splitChainage}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
            >
              {splitting ? 'Splitting...' : 'Execute Split'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
