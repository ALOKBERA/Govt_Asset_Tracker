'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Send,
  Camera,
  MapPin,
  CheckCircle2,
  Lock,
  ExternalLink,
  ClipboardCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function PublicAssetQrPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = use(params);
  const { data: session } = useSession();

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Citizen Report Form State
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    fetch(`/api/public/assets/${assetId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setAsset(json.data);
      })
      .finally(() => setLoading(false));
  }, [assetId]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    setReportError('');

    try {
      const res = await fetch('/api/citizen-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: assetId,
          description,
          photoUrl: photoUrl || undefined,
          reporterName,
          reporterPhone,
          honeypot,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit report');

      setReportSuccess(true);
    } catch (err: any) {
      setReportError(err.message || 'Submission error');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white text-xs">
        Verifying Government Asset Identification Plate...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800 text-white border-slate-700 text-center p-6 space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold">Unrecognized Asset QR Tag</h2>
          <p className="text-xs text-slate-400">
            The scanned QR code ({assetId}) is not registered in the Government of Gujarat R&B Department Asset Registry.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 antialiased">
      {/* Top Branding */}
      <div className="max-w-md w-full text-center space-y-1 mb-4">
        <div className="inline-flex h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20 mb-1">
          <Layers className="h-5 w-5" />
        </div>
        <h2 className="text-base font-extrabold tracking-tight text-white uppercase">
          Government of Gujarat · R&B Department
        </h2>
        <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
          <ShieldCheck className="h-3 w-3" />
          <span>Verified State Public Infrastructure Asset</span>
        </div>
      </div>

      {/* Main Public Card */}
      <div className="max-w-md w-full space-y-4">
        <Card className="bg-slate-800 border-slate-700 text-white shadow-2xl overflow-hidden">
          <CardHeader className="bg-slate-800/80 border-b border-slate-700 pb-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black bg-emerald-600 text-white px-2 py-0.5 rounded">
                {asset.assetId}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase bg-slate-700 px-2 py-0.5 rounded">
                {asset.classCode} · {asset.subType || 'Structure'}
              </span>
            </div>
            <CardTitle className="text-base font-black text-white mt-2 leading-tight">
              {asset.name}
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Jurisdiction: {asset.division} · {asset.subdivision}
            </p>
          </CardHeader>

          <CardContent className="p-4 space-y-3 text-xs">
            {/* Operational Status Warning (e.g. Restricted Bridge) */}
            {asset.operationalStatus && asset.operationalStatus !== 'OPEN' && (
              <div className="p-3 bg-rose-900/60 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
                <div>
                  <p className="font-bold uppercase tracking-wider">Safety Status: {asset.operationalStatus}</p>
                  {asset.loadRestriction && <p className="text-[11px] text-rose-300">Load Limit: {asset.loadRestriction} Tonnes</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-700/50 p-2 rounded-lg">
                <span className="text-slate-400">Current Status</span>
                <p className="font-bold text-white mt-0.5">{asset.status}</p>
              </div>
              <div className="bg-slate-700/50 p-2 rounded-lg">
                <span className="text-slate-400">Last Inspected</span>
                <p className="font-bold text-white mt-0.5">{formatDate(asset.lastInspectionAt)}</p>
              </div>
            </div>

            {asset.linear && (
              <div className="bg-slate-700/50 p-2.5 rounded-lg space-y-0.5 text-[11px]">
                <span className="text-slate-400 font-medium">Route Corridor:</span>
                <p className="font-bold text-white">{asset.linear.routeCode}</p>
              </div>
            )}

            {/* Authenticated Staff Quick Actions */}
            {session?.user && (
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Staff Mode Active</span>
                <div className="flex space-x-2">
                  <Link href={`/inspections?newFor=${asset.assetId}`}>
                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 px-2 font-bold">
                      <ClipboardCheck className="h-3 w-3 mr-1" /> Inspect
                    </Button>
                  </Link>
                  <Link href={`/assets/${asset.assetId}`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-slate-200 border-slate-600">
                      Dashboard <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Citizen Grievance / Problem Reporting Form */}
        <Card className="bg-slate-800 border-slate-700 text-white shadow-xl">
          <CardHeader className="pb-3 border-b border-slate-700">
            <CardTitle className="text-sm font-bold text-emerald-400 flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span>Report an Issue / Pothole / Hazard</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-slate-400">
              Submit public feedback directly to the Executive Engineer's office.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4">
            {reportSuccess ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500 rounded-xl text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Grievance Submitted Successfully!</h4>
                <p className="text-xs text-emerald-200">
                  Your issue report has been logged and routed to the maintaining R&B Sub-division for immediate action.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
                {reportError && (
                  <div className="p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-[11px]">
                    {reportError}
                  </div>
                )}

                {/* Honeypot field (hidden) */}
                <input
                  type="text"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Problem Description *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe issue (e.g. Deep pothole, railing damage, water stagnation, broken streetlight)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Photo URL / Proof (Optional)</label>
                  <Input
                    placeholder="https://... photo link"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="mt-1 h-8 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">Your Name (Optional)</label>
                    <Input
                      placeholder="Name"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      className="mt-1 h-8 bg-slate-900 border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">Phone (Optional)</label>
                    <Input
                      placeholder="Phone for updates"
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      className="mt-1 h-8 bg-slate-900 border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submittingReport || !description.trim()}
                  className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md mt-2"
                >
                  {submittingReport ? 'Submitting...' : 'Submit Issue to Department'}
                  <Send className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
