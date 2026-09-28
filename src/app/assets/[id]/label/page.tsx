'use client';

import React, { useEffect, useState, use } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AssetLabelPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [asset, setAsset] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assets/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setAsset(json.data.asset);
          const publicUrl = `${window.location.origin}/a/${json.data.asset.assetId}`;
          QRCode.toDataURL(publicUrl, { width: 300, margin: 1 })
            .then(setQrUrl)
            .catch(console.error);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !asset) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading label data...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center justify-center">
      {/* Print Controls (hidden on print) */}
      <div className="mb-6 flex items-center space-x-3 print:hidden">
        <Link href={`/assets/${asset.assetId}`}>
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Asset
          </Button>
        </Link>
        <Button
          size="sm"
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
        >
          <Printer className="h-4 w-4 mr-1.5" /> Print Tag Label
        </Button>
      </div>

      {/* Official Government Physical Identification Plate (Printable) */}
      <div className="w-[450px] bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-2xl text-slate-900 space-y-4 print:border-black print:shadow-none print:w-full print:max-w-md">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div>
            <h3 className="font-extrabold text-sm tracking-tight uppercase">Government of Gujarat</h3>
            <p className="text-[11px] font-bold text-slate-600">Roads & Buildings Department</p>
          </div>
          <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-2 py-0.5 rounded">
            Official Asset
          </span>
        </div>

        {/* QR & Core Identifiers */}
        <div className="flex items-center space-x-4">
          <div className="p-1 border-2 border-slate-900 rounded-lg bg-white shrink-0">
            {qrUrl ? (
              <img src={qrUrl} alt="Asset QR" className="w-28 h-28 object-contain" />
            ) : (
              <div className="w-28 h-28 bg-slate-100 animate-pulse" />
            )}
          </div>

          <div className="space-y-1 text-xs">
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-400">Asset Permanent ID</p>
              <p className="text-base font-mono font-black tracking-tight text-slate-900">
                {asset.assetId}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase text-slate-400">Asset Title</p>
              <p className="font-bold text-slate-800 line-clamp-2 leading-tight">{asset.name}</p>
            </div>

            <div className="flex items-center space-x-2 text-[10px] font-semibold text-slate-600 pt-1">
              <span>{asset.classCode}</span>
              <span>·</span>
              <span>{(asset.divisionId as any)?.name || asset.districtCode}</span>
            </div>
          </div>
        </div>

        {/* Code128 Mock Barcode representation */}
        <div className="pt-2 border-t-2 border-slate-900 text-center space-y-1">
          <div className="h-9 w-full flex items-center justify-center space-x-0.5 overflow-hidden">
            {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3].map((w, i) => (
              <span
                key={i}
                className="h-full bg-slate-900"
                style={{ width: `${w * 2}px` }}
              ></span>
            ))}
          </div>
          <p className="text-[10px] font-mono tracking-widest text-slate-600 font-bold">{asset.assetId}</p>
        </div>

        {/* Placement Instructions */}
        <p className="text-[9px] text-center text-slate-400 font-medium italic">
          Affix on physical asset (parapet / entrance / KM stone / chassis). Scan to inspect or report issues.
        </p>
      </div>
    </div>
  );
}
