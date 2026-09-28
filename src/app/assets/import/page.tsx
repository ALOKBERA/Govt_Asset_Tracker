'use client';

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { DISTRICT_CODES } from '@/lib/constants';

export default function AssetsImportPage() {
  const router = useRouter();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [orgUnits, setOrgUnits] = useState<any[]>([]);
  const [defaultSubdivision, setDefaultSubdivision] = useState('');
  const [defaultDistrict, setDefaultDistrict] = useState('VAD');

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/org-units')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setOrgUnits(json.data);
          const sub = json.data.find((o: any) => o.type === 'SUBDIVISION');
          if (sub) setDefaultSubdivision(sub._id);
        }
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      setParsedRows(parsed.data);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sample = `name,classCode,subType,districtCode,cost,year,notes
Vadodara Old River Bridge,BRG,MAJOR_BRIDGE,VAD,35000000,1985,IBMS-GJ-042 Scour prone
Ahmedabad Bypass Link,RDS,SH,AHM,120000000,2015,SH-4 4-lane stretch
Civil Hospital Quarters Block C,BLD,RESIDENTIAL_QUARTERS,GNR,18000000,2010,Fire NOC verified
Tata Hitachi Excavator Ex-200,MCH,EXCAVATOR,SUR,4500000,2021,AMC valid till Dec 2026`;

    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rnb_gujarat_asset_import_sample.csv';
    a.click();
  };

  const handleExecuteImport = async () => {
    if (!csvText) return;
    setImporting(true);
    setError('');

    try {
      const selectedOrg = orgUnits.find((o) => o._id === defaultSubdivision);
      const res = await fetch('/api/assets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText,
          defaultSubdivisionId: defaultSubdivision,
          defaultDivisionId: selectedOrg?.parentId,
          defaultDistrictCode: defaultDistrict,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');

      setImportResult(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">Batch Legacy Asset Import (CSV)</h1>
            <p className="text-xs text-slate-500 font-medium">
              Import existing assets into registry. Automatically generates immutable IDs and sets status to IN_SERVICE.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadSample} className="text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Sample CSV
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {importResult ? (
          <Card className="border-emerald-200 bg-white p-6 text-center space-y-4 shadow-sm">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Import Batch Finished!</h2>
            <div className="flex justify-center space-x-4 text-xs">
              <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {importResult.imported} Assets Successfully Imported
              </span>
              {importResult.failed > 0 && (
                <span className="text-rose-700 font-bold bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                  {importResult.failed} Rows Failed
                </span>
              )}
            </div>

            <div className="pt-2 flex justify-center space-x-3">
              <Button onClick={() => router.push('/assets')} className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold">
                View in Asset Register &rarr;
              </Button>
              <Button variant="outline" onClick={() => setImportResult(null)} className="text-xs">
                Import Another File
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm space-y-4 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Default Sub-division Jurisdiction</label>
                <select
                  value={defaultSubdivision}
                  onChange={(e) => setDefaultSubdivision(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs"
                >
                  {orgUnits
                    .filter((o) => o.type === 'SUBDIVISION')
                    .map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Default District Code</label>
                <select
                  value={defaultDistrict}
                  onChange={(e) => setDefaultDistrict(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs"
                >
                  {Object.keys(DISTRICT_CODES).map((d) => (
                    <option key={d} value={DISTRICT_CODES[d]}>
                      {d} ({DISTRICT_CODES[d]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop / File select box */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Upload CSV File</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Columns: name, classCode, subType, districtCode, cost, year, notes
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
              />
            </div>

            {/* Validation Table Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Preview Data ({parsedRows.length} Rows Detected)
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    Validation Ready
                  </Badge>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Class</th>
                        <th className="p-2">District</th>
                        <th className="p-2">Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td className="p-2 text-slate-400">{i + 1}</td>
                          <td className="p-2 font-semibold text-slate-800">{r.name || r.Name}</td>
                          <td className="p-2">{r.classCode || r['Class Code'] || 'RDS'}</td>
                          <td className="p-2">{r.districtCode || defaultDistrict}</td>
                          <td className="p-2 font-mono">{r.cost || '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleExecuteImport}
                disabled={importing || parsedRows.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
              >
                {importing ? 'Processing Batch...' : `Import ${parsedRows.length} Assets`}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
