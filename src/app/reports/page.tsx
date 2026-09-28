'use client';

import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, Layers, Building, Road, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('road-inventory');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (endpoint: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/${endpoint}`);
      const json = await res.json();
      if (json.success) setReportData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport]);

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;
    const csv = Papa.unparse(reportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rnb_gujarat_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900">Official Departmental Statements & Registers</h1>
              <Badge variant="secondary" className="font-bold text-xs">
                Audit Ready
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Structured hierarchical reports for Assembly, Chief Engineer, and Ministry audits
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || reportData.length === 0}
            className="h-9 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
          >
            <Download className="h-4 w-4 mr-1.5 text-emerald-400" />
            Download Report (CSV)
          </Button>
        </div>

        {/* Tabbed Reports */}
        <Tabs value={activeReport} onValueChange={setActiveReport} className="space-y-4">
          <TabsList className="bg-slate-100/90 border border-slate-200 flex-wrap h-auto p-1.5 gap-1">
            <TabsTrigger value="road-inventory">Road Inventory Statement</TabsTrigger>
            <TabsTrigger value="bridge-register">Bridge Register</TabsTrigger>
            <TabsTrigger value="building-register">Building Stock by Dept</TabsTrigger>
            <TabsTrigger value="compliance">Inspection Compliance</TabsTrigger>
            <TabsTrigger value="dlp-tracker">DLP Liability Tracker</TabsTrigger>
            <TabsTrigger value="decommissioned">Condemned / Disposed</TabsTrigger>
          </TabsList>

          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-xs">Generating report data...</div>
              ) : reportData.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">No records available for this register.</div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      {Object.keys(reportData[0] || {}).map((header) => (
                        <th key={header} className="py-3 px-4 whitespace-nowrap">
                          {header.replace(/([A-Z])/g, ' $1').toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        {Object.keys(row).map((key) => (
                          <td key={key} className="py-2.5 px-4 whitespace-nowrap text-slate-700">
                            {typeof row[key] === 'object' && row[key] !== null
                              ? JSON.stringify(row[key])
                              : String(row[key] ?? 'N/A')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </Tabs>
      </div>
    </AppLayout>
  );
}
