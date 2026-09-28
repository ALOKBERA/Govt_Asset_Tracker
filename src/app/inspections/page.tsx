'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { DefectPicker, DefectItem } from '@/components/inspections/DefectPicker';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ClipboardCheck,
  Plus,
  QrCode,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  Camera,
  Layers,
} from 'lucide-react';
import { INSPECTION_TYPES, RECOMMENDED_ACTIONS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

export default function InspectionsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading inspections...</div>}>
      <InspectionsContent />
    </React.Suspense>
  );
}

function InspectionsContent() {
  const searchParams = useSearchParams();
  const preselectedAssetId = searchParams.get('newFor') || '';

  const [activeTab, setActiveTab] = useState(preselectedAssetId ? 'new' : 'due');
  const [inspections, setInspections] = useState<any[]>([]);
  const [drives, setDrives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for New Inspection
  const [assetIdInput, setAssetIdInput] = useState(preselectedAssetId);
  const [targetAsset, setTargetAsset] = useState<any>(null);
  const [inspType, setInspType] = useState('ROUTINE');
  const [conditionScore, setConditionScore] = useState<number>(4);
  const [defects, setDefects] = useState<DefectItem[]>([]);
  const [recommendedAction, setRecommendedAction] = useState('NONE');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [remarks, setRemarks] = useState('');
  const [gpsCaptured, setGpsCaptured] = useState<{ lat?: number; lng?: number }>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // QR Scanner modal state
  const [isQrScanOpen, setIsQrScanOpen] = useState(false);
  const [manualQrInput, setManualQrInput] = useState('');

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const [inspRes, drivesRes] = await Promise.all([
        fetch('/api/inspections?limit=100'),
        fetch('/api/inspection-drives'),
      ]);
      const inspJson = await inspRes.json();
      const drivesJson = await drivesRes.json();

      if (inspJson.success) setInspections(inspJson.data);
      if (drivesJson.success) setDrives(drivesJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  useEffect(() => {
    if (assetIdInput) {
      fetch(`/api/assets/${assetIdInput}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setTargetAsset(json.data.asset);
        })
        .catch(console.error);
    }
  }, [assetIdInput]);

  const handleCaptureGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setGpsCaptured({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  };

  const handleInspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAsset) {
      setSubmitError('Please select or verify valid asset ID first');
      return;
    }
    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        assetId: targetAsset._id,
        type: inspType,
        conditionScore,
        defects,
        recommendedAction,
        estimatedCost: parseFloat(estimatedCost) || undefined,
        remarks,
        gpsLat: gpsCaptured.lat,
        gpsLng: gpsCaptured.lng,
      };

      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Inspection submission failed');

      setSubmitSuccess(true);
      fetchInspections();
    } catch (err: any) {
      setSubmitError(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900">Infrastructure Inspections & Monitoring</h1>
              <Badge variant="secondary" className="font-bold text-xs">
                {inspections.length} Logs
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pre/Post-Monsoon Drives · Field Defect Logging · Automated Rating Updates
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsQrScanOpen(true)}
              className="h-9 text-xs font-semibold"
            >
              <QrCode className="h-4 w-4 mr-1.5 text-slate-600" />
              Scan QR
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setActiveTab('new');
                setSubmitSuccess(false);
              }}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              + Run Inspection
            </Button>
          </div>
        </div>

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100/90 border border-slate-200">
            <TabsTrigger value="due">Due / Overdue</TabsTrigger>
            <TabsTrigger value="completed">Completed History</TabsTrigger>
            <TabsTrigger value="drives">Monsoon Drives ({drives.length})</TabsTrigger>
            <TabsTrigger value="new">Fast Field Form</TabsTrigger>
          </TabsList>

          {/* TAB 1: Due / Overdue */}
          <TabsContent value="due">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>Scheduled & Overdue Inspections</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 mb-4">
                  Prioritized by statutory pre/post-monsoon windows and periodic structural frequency.
                </p>
                <div className="space-y-3">
                  {inspections.slice(0, 6).map((item) => (
                    <div
                      key={item._id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:bg-slate-100 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900">{item.assetCode}</span>
                          <Badge variant="warning">{item.type?.replace('_', ' ')}</Badge>
                        </div>
                        <p className="font-semibold text-slate-800">{(item.assetId as any)?.name || 'Asset'}</p>
                        <p className="text-[11px] text-slate-500">
                          Last Inspected: {formatDate(item.date)} · Rating: {item.conditionScore}/5
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setAssetIdInput(item.assetCode);
                          setActiveTab('new');
                        }}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 font-bold"
                      >
                        Start Inspection
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Completed History */}
          <TabsContent value="completed">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Asset ID</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Inspector</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Defects</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspections.map((i) => (
                      <tr key={i._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">{formatDate(i.date)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <Link href={`/assets/${i.assetCode}`} className="hover:text-emerald-600">
                            {i.assetCode}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">{i.type?.replace('_', ' ')}</td>
                        <td className="py-3 px-4 text-slate-600">{i.inspectorName}</td>
                        <td className="py-3 px-4 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] text-white ${
                              i.conditionScore <= 1
                                ? 'bg-rose-600'
                                : i.conditionScore <= 2
                                ? 'bg-orange-500'
                                : i.conditionScore <= 3
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                          >
                            {i.conditionScore}/5
                          </span>
                        </td>
                        <td className="py-3 px-4">{i.defects?.length || 0} defect(s)</td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">{i.recommendedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: Monsoon Drives Dashboard */}
          <TabsContent value="drives">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drives.map((d) => (
                <Card key={d._id} className="border-slate-200 shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{d.name}</span>
                    <Badge variant={d.status === 'ACTIVE' ? 'success' : 'secondary'}>{d.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Window: {formatDate(d.windowStart)} to {formatDate(d.windowEnd)}
                  </p>
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Completion Progress</span>
                      <span className="text-emerald-700">{d.progressPercent || 0}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-emerald-600 transition-all"
                        style={{ width: `${d.progressPercent || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 4: Fast Field Mobile Inspection Form */}
          <TabsContent value="new">
            <Card className="border-slate-200 shadow-sm max-w-2xl mx-auto">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base font-bold text-slate-900">
                  Fast Mobile Field Inspection Flow
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect asset on site, score condition, log defect photos, and record GPS proof.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {submitSuccess ? (
                  <div className="p-6 text-center space-y-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                    <h3 className="text-base font-black text-slate-900">Inspection Submitted Successfully!</h3>
                    <p className="text-xs text-slate-600">
                      Asset condition rating updated in ledger and cryptographic SHA-256 audit event generated.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSubmitSuccess(false);
                        setDefects([]);
                        setRemarks('');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                    >
                      Run Another Inspection
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleInspectionSubmit} className="space-y-4 text-xs">
                    {submitError && (
                      <div className="p-3 bg-red-50 text-red-700 rounded-lg font-semibold text-xs">
                        {submitError}
                      </div>
                    )}

                    {/* Target Asset Selector */}
                    <div>
                      <label className="font-semibold text-slate-700">Target Asset Code / ID *</label>
                      <div className="flex space-x-2 mt-1">
                        <Input
                          placeholder="e.g. GJ-RNB-BRG-VAD-000001"
                          value={assetIdInput}
                          onChange={(e) => setAssetIdInput(e.target.value)}
                          className="h-9 text-xs font-mono"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsQrScanOpen(true)}
                          className="h-9 px-3 text-xs"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>

                      {targetAsset && (
                        <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 space-y-0.5">
                          <p className="font-bold">{targetAsset.name}</p>
                          <p className="text-slate-600">
                            Class: {targetAsset.classCode} · Status: {targetAsset.status} · Prev Score: {targetAsset.conditionScore}/5
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Inspection Schedule Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700">Inspection Category *</label>
                        <select
                          value={inspType}
                          onChange={(e) => setInspType(e.target.value)}
                          className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:ring-2 focus:ring-emerald-500"
                        >
                          {INSPECTION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700">GPS Evidence Capture</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCaptureGps}
                          className="mt-1 w-full h-9 text-xs justify-center font-medium"
                        >
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                          {gpsCaptured.lat
                            ? `Lat: ${gpsCaptured.lat.toFixed(4)}, Lng: ${gpsCaptured.lng?.toFixed(4)}`
                            : 'Auto-Capture Field GPS'}
                        </Button>
                      </div>
                    </div>

                    {/* Condition Rating 1 to 5 */}
                    <div>
                      <label className="font-semibold text-slate-700">
                        Overall Structural Condition Rating * (5 = Very Good, 1 = Critical Hazard)
                      </label>
                      <div className="grid grid-cols-5 gap-2 mt-1">
                        {[
                          { score: 5, label: 'Very Good', color: 'bg-emerald-600' },
                          { score: 4, label: 'Good', color: 'bg-emerald-500' },
                          { score: 3, label: 'Fair', color: 'bg-amber-500' },
                          { score: 2, label: 'Poor', color: 'bg-orange-500' },
                          { score: 1, label: 'Critical', color: 'bg-rose-600' },
                        ].map((item) => (
                          <button
                            type="button"
                            key={item.score}
                            onClick={() => setConditionScore(item.score)}
                            className={`py-2 px-1 rounded-xl text-center transition-all border ${
                              conditionScore === item.score
                                ? `${item.color} text-white font-black shadow-md ring-2 ring-slate-900`
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <p className="text-sm font-black">{item.score}</p>
                            <p className="text-[10px] font-semibold truncate">{item.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Defect Logger Component */}
                    <DefectPicker
                      classCode={targetAsset?.classCode || 'RDS'}
                      isDlpActive={targetAsset?.status === 'DEFECT_LIABILITY'}
                      defects={defects}
                      onChange={setDefects}
                    />

                    {/* Recommendation & Cost */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-700">Recommended Next Action</label>
                        <select
                          value={recommendedAction}
                          onChange={(e) => setRecommendedAction(e.target.value)}
                          className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:ring-2 focus:ring-emerald-500"
                        >
                          {RECOMMENDED_ACTIONS.map((a) => (
                            <option key={a} value={a}>
                              {a.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700">Estimated Repair Cost (₹)</label>
                        <Input
                          type="number"
                          placeholder="e.g. 150000"
                          value={estimatedCost}
                          onChange={(e) => setEstimatedCost(e.target.value)}
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700">Inspector Field Notes</label>
                      <Input
                        placeholder="Detailed observations on pavement or bridge structural elements..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                    >
                      {submitting ? 'Submitting & Recalculating Scores...' : 'Submit Official Inspection Record'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Scanner / Manual ID Input Modal */}
      <Dialog open={isQrScanOpen} onOpenChange={setIsQrScanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan / Lookup Asset QR Tag</DialogTitle>
            <DialogDescription className="text-xs">
              Simulate or enter the physical tag Asset ID.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-900 rounded-xl text-center text-white space-y-2">
              <QrCode className="h-12 w-12 text-emerald-400 mx-auto animate-pulse" />
              <p className="text-xs font-medium">Camera QR Scanner Simulation Ready</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Or Paste Scanned Code</label>
              <Input
                placeholder="GJ-RNB-BRG-VAD-000001"
                value={manualQrInput}
                onChange={(e) => setManualQrInput(e.target.value)}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                setAssetIdInput(manualQrInput);
                setIsQrScanOpen(false);
                setActiveTab('new');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
            >
              Select Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
