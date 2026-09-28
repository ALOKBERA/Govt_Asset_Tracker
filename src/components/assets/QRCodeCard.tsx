'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Printer, Copy, Check, QrCode as QrIcon, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface QRCodeCardProps {
  assetId: string;
  name: string;
  classCode: string;
  districtCode: string;
}

export function QRCodeCard({ assetId, name, classCode, districtCode }: QRCodeCardProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const publicScanUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/a/${assetId}`
    : `/a/${assetId}`;

  useEffect(() => {
    if (assetId) {
      QRCode.toDataURL(publicScanUrl, {
        width: 240,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error(err));
    }
  }, [assetId, publicScanUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(publicScanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.open(`/assets/${assetId}/label`, '_blank');
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <QrIcon className="h-4 w-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Official Asset Identification Tag
          </h4>
        </div>
        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          {classCode} · {districtCode}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
        {/* QR Image */}
        <div className="p-2 border border-slate-200 rounded-lg bg-white shadow-inner shrink-0">
          {qrUrl ? (
            <img src={qrUrl} alt={`QR Code for ${assetId}`} className="w-32 h-32 object-contain" />
          ) : (
            <div className="w-32 h-32 bg-slate-100 animate-pulse flex items-center justify-center text-[10px] text-slate-400">
              Generating...
            </div>
          )}
        </div>

        {/* Metadata & Actions */}
        <div className="space-y-2 flex-1 w-full text-center sm:text-left">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Immutable Asset Code</p>
            <p className="text-sm font-mono font-bold text-slate-900">{assetId}</p>
          </div>

          <div className="text-xs text-slate-600 truncate max-w-[260px] font-medium">
            {name}
          </div>

          <p className="text-[11px] text-slate-400">
            Physical QR plate placement: bridge parapet, building entrance, first KM stone, or machinery chassis.
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              onClick={handlePrint}
              className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Label
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-8 text-xs px-2.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy URL'}
            </Button>

            <Link href={`/a/${assetId}`} target="_blank">
              <Button size="sm" variant="ghost" className="h-8 text-xs px-2 text-slate-600">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Public View
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
