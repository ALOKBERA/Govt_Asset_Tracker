'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
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
  Hammer,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { WORK_TYPES, WORK_STATUSES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function WorksPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading works...</div>}>
      <WorksContent />
    </React.Suspense>
  );
}

function WorksContent() {
  const searchParams = useSearchParams();
  const preselectedAssetId = searchParams.get('newFor') || '';

  const [works, setWorks] = useState<any[]>([]);
  const [dlpAssets, setDlpAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Work Modal State
  const [isNewWorkOpen, setIsNewWorkOpen] = useState(Boolean(preselectedAssetId));
  const [assetIdInput, setAssetIdInput] = useState(preselectedAssetId);
  const [targetAsset, setTargetAsset] = useState<any>(null);
  const [workType, setWorkType] = useState('PERIODIC_RENEWAL');
  const [aaNo, setAaNo] = useState('');
  const [tsNo, setTsNo] = useState('');
  const [contractor, setContractor] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [dlpMonths, setDlpMonths] = useState('36');
  const [description, setDescription] = useState('');
  const [submittingWork, setSubmittingWork] = useState(false);
  const [workError, setWorkError] = useState('');

  // Complete Work Modal State
  const [selectedWorkToComplete, setSelectedWorkToComplete] = useState<any>(null);
  const [actualCost, setActualCost] = useState('');
  const [actualCompletionDate, setActualCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [completing, setCompleting] = useState(false);

  const fetchWorksData = async () => {
    try {
      setLoading(true);
      const [worksRes, dlpRes] = await Promise.all([
        fetch('/api/works?limit=100'),
        fetch('/api/reports/dlp-tracker'),
      ]);
      const worksJson = await worksRes.json();
      const dlpJson = await dlpRes.json();

      if (worksJson.success) setWorks(worksJson.data);
      if (dlpJson.success) setDlpAssets(dlpJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorksData();
  }, []);

  useEffect(() => {
    if (assetIdInput) {
      fetch(`/api/assets/${assetIdInput}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setTargetAsset(json.data.asset);
        });
    }
  }, [assetIdInput]);

  const handleCreateWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAsset) return;
    setSubmittingWork(true);
    setWorkError('');

    try {
      const payload = {
        assetId: targetAsset._id,
        type: workType,
        aaNo,
        tsNo,
        contractor,
        estimatedCost: parseFloat(estimatedCost) || 0,
        dlpMonths: parseInt(dlpMonths) || 36,
        description,
      };

      const res = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to sanction work');

      setIsNewWorkOpen(false);
      fetchWorksData();
    } catch (err: any) {
      setWorkError(err.message);
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleCompleteWork = async () => {
    if (!selectedWorkToComplete) return;
    setCompleting(true);

    try {
      const res = await fetch(`/api/works/${selectedWorkToComplete._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualCost: parseFloat(actualCost) || selectedWorkToComplete.estimatedCost,
          actualCompletion: actualCompletionDate,
          dlpMonths: parseInt(dlpMonths) || 36,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to complete work');

      setSelectedWorkToComplete(null);
      fetchWorksData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900">Works Sanction & DLP Warranty Management</h1>
              <Badge variant="secondary" className="font-bold text-xs">
                {works.length} Work Orders
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              AA/TS Sanctions · Resurfacing Renewal Clock Reset · Defect Liability Period (DLP) Enforcement
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsNewWorkOpen(true)}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            + Sanction Work Order
          </Button>
        </div>

        {/* Tabbed Views */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-slate-100/90 border border-slate-200">
            <TabsTrigger value="all">All Work Orders ({works.length})</TabsTrigger>
            <TabsTrigger value="dlp">DLP Active Warranty Tracker ({dlpAssets.length})</TabsTrigger>
          </TabsList>

          {/* TAB 1: All Work Orders */}
          <TabsContent value="all">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Work Type</th>
                      <th className="py-3 px-4">Asset Code</th>
                      <th className="py-3 px-4">Sanction Refs (AA/TS)</th>
                      <th className="py-3 px-4">Contractor</th>
                      <th className="py-3 px-4">Cost (₹)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">DLP Warranty</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {works.map((w) => (
                      <tr key={w._id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{w.type?.replace('_', ' ')}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                          <Link href={`/assets/${w.assetCode}`} className="hover:underline">
                            {w.assetCode}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <p>AA: {w.aaNo || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400">TS: {w.tsNo || 'N/A'}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-semibold">{w.contractor || 'TBD'}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {formatCurrency(w.actualCost || w.estimatedCost)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={w.status === 'COMPLETED' ? 'success' : 'secondary'}>
                            {w.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {w.dlpEndDate ? (
                            <span className="font-semibold text-emerald-700">Till {formatDate(w.dlpEndDate)}</span>
                          ) : (
                            <span>{w.dlpMonths || 36} Months</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {w.status !== 'COMPLETED' && w.status !== 'CLOSED' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedWorkToComplete(w);
                                setActualCost(w.estimatedCost?.toString() || '');
                              }}
                              className="h-7 text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold"
                            >
                              Complete Work
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: DLP Active Warranty Tracker */}
          <TabsContent value="dlp">
            <Card className="border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Defect Liability Period (DLP) Active Registry
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Any defect reported on these assets is legally marked <strong>Contractor Liable</strong>. Mandatory final inspection fires 60 days before expiry.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {dlpAssets.map((a) => (
                  <div
                    key={a.assetId}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{a.assetId}</span>
                      <Badge variant={a.isExpiringSoon ? 'critical' : 'warning'}>
                        {a.daysRemaining > 0 ? `${a.daysRemaining} days left` : 'Expired'}
                      </Badge>
                    </div>

                    <p className="font-semibold text-slate-800 line-clamp-1">{a.name}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <div>
                        <span>Contractor:</span> <strong className="text-slate-800">{a.contractor}</strong>
                      </div>
                      <div>
                        <span>DLP Expires:</span> <strong className="text-emerald-700">{formatDate(a.dlpEndDate)}</strong>
                      </div>
                      <div>
                        <span>Liable Defects:</span> <strong className="text-rose-700">{a.contractorLiableDefects} logged</strong>
                      </div>
                      <div>
                        <span>Work Cost:</span> <strong className="text-slate-800">{formatCurrency(a.workCost)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sanction New Work Order Modal */}
      <Dialog open={isNewWorkOpen} onOpenChange={setIsNewWorkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sanction New Work Order</DialogTitle>
            <DialogDescription className="text-xs">
              Record Administrative Approval & Technical Sanction for asset maintenance/construction.
            </DialogDescription>
          </DialogHeader>

          {workError && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">
              {workError}
            </div>
          )}

          <form onSubmit={handleCreateWork} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700">Asset ID / Code *</label>
              <Input
                placeholder="GJ-RNB-SEG-VAD-000001"
                value={assetIdInput}
                onChange={(e) => setAssetIdInput(e.target.value)}
                className="mt-1 h-9 text-xs font-mono"
                required
              />
              {targetAsset && (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  Selected: {targetAsset.name} ({targetAsset.classCode})
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700">Work Type *</label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs"
                >
                  {WORK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Estimated Cost (₹) *</label>
                <Input
                  type="number"
                  placeholder="e.g. 1500000"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700">Administrative Approval (AA) Ref</label>
                <Input
                  placeholder="AA/2026/089"
                  value={aaNo}
                  onChange={(e) => setAaNo(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Technical Sanction (TS) Ref</label>
                <Input
                  placeholder="TS/2026/045"
                  value={tsNo}
                  onChange={(e) => setTsNo(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700">Awarded Contractor Name</label>
                <Input
                  placeholder="Contractor Infra Ltd."
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">DLP Warranty (Months)</label>
                <Input
                  type="number"
                  value={dlpMonths}
                  onChange={(e) => setDlpMonths(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Work Scope & Specifications</label>
              <Input
                placeholder="Details of treatment (e.g. 40mm BC overlay + drain repair)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsNewWorkOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingWork}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
              >
                {submittingWork ? 'Sanctioning...' : 'Sanction Work Order'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Work Modal */}
      <Dialog open={Boolean(selectedWorkToComplete)} onOpenChange={() => setSelectedWorkToComplete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Work Order & Start DLP</DialogTitle>
            <DialogDescription className="text-xs">
              Mark {selectedWorkToComplete?.type} on {selectedWorkToComplete?.assetCode} as completed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-[11px]">
              <p className="font-bold">Lifecycle Automation Effect:</p>
              <p>
                - Updates asset renewal clock and starts {selectedWorkToComplete?.dlpMonths || 36}-month Defect Liability Period.
              </p>
              <p>- Moves asset status to <strong>DEFECT_LIABILITY</strong>.</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Actual Final Cost (₹)</label>
              <Input
                type="number"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Actual Physical Completion Date</label>
              <Input
                type="date"
                value={actualCompletionDate}
                onChange={(e) => setActualCompletionDate(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedWorkToComplete(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCompleteWork}
              disabled={completing}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
            >
              {completing ? 'Updating...' : 'Confirm Completion & Start DLP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
