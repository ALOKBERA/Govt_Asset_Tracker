'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { MapContainerWrapper } from '@/components/map/MapContainerWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Layers,
  List,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { CLASS_LABELS, CLASS_CODES, DISTRICT_CODES } from '@/lib/constants';

export default function AssetsListPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading assets...</div>}>
      <AssetsContent />
    </React.Suspense>
  );
}

function AssetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [assets, setAssets] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [classCode, setClassCode] = useState(searchParams.get('classCode') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [inspectionOverdue, setInspectionOverdue] = useState(searchParams.get('inspectionOverdue') === 'true');
  const [dlpActive, setDlpActive] = useState(searchParams.get('dlpActive') === 'true');
  const [viewMode, setViewMode] = useState<'list' | 'map'>(
    searchParams.get('view') === 'map' ? 'map' : 'list'
  );

  const fetchAssets = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', viewMode === 'map' ? '150' : '20');

      if (search) params.set('search', search);
      if (classCode) params.set('classCode', classCode);
      if (status) params.set('status', status);
      if (condition) params.set('condition', condition);
      if (inspectionOverdue) params.set('inspectionOverdue', 'true');
      if (dlpActive) params.set('dlpActive', 'true');

      const res = await fetch(`/api/assets?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAssets(json.data);
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets(1);
  }, [classCode, status, condition, inspectionOverdue, dlpActive, viewMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAssets(1);
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900">Infrastructure Asset Register</h1>
              <Badge variant="secondary" className="font-bold text-xs">
                {pagination.total} Records
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Unique IDs, GPS geometry, chainage, condition scores, and lifecycle tracking
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/assets/import">
              <Button size="sm" variant="outline" className="h-9 text-xs">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import CSV
              </Button>
            </Link>

            <a href="/api/assets/export" target="_blank" download>
              <Button size="sm" variant="outline" className="h-9 text-xs">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
            </a>

            <Link href="/assets/new">
              <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" />
                + Add Asset
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter bar & View Toggles */}
        <Card className="border-slate-200 shadow-sm p-4 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by Asset ID, Name, or Route Code (e.g. GJ-RNB-BRG, SH-4)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-slate-50 focus:bg-white"
                />
              </div>
              <Button type="submit" size="sm" className="h-9 text-xs bg-slate-900 text-white">
                Search
              </Button>
            </form>

            {/* List vs Map View toggle */}
            <div className="flex items-center space-x-2 border-t md:border-t-0 pt-2 md:pt-0">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'map'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>GIS Map</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Class:
            </span>
            <button
              onClick={() => setClassCode('')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                classCode === '' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              All Classes
            </button>
            {CLASS_CODES.map((code) => (
              <button
                key={code}
                onClick={() => setClassCode(code)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  classCode === code ? 'bg-emerald-600 text-white border-emerald-600 font-bold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {CLASS_LABELS[code]}
              </button>
            ))}

            {/* Quick Status Toggles */}
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-2 mr-1">
              Flags:
            </span>
            <button
              onClick={() => setInspectionOverdue(!inspectionOverdue)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                inspectionOverdue ? 'bg-rose-600 text-white border-rose-600 font-bold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Inspection Overdue
            </button>
            <button
              onClick={() => setDlpActive(!dlpActive)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                dlpActive ? 'bg-amber-600 text-white border-amber-600 font-bold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              DLP Active
            </button>
          </div>
        </Card>

        {/* Content: List or Map */}
        {viewMode === 'map' ? (
          <Card className="border-slate-200 p-2 shadow-sm">
            <MapContainerWrapper assets={assets} height="600px" />
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Asset ID / Code</th>
                    <th className="py-3 px-4">Asset Name</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Jurisdiction</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Loading assets inventory...
                      </td>
                    </tr>
                  ) : assets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No assets found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => (
                      <tr key={asset._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <Link href={`/assets/${asset.assetId}`} className="hover:text-emerald-600">
                            {asset.assetId}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800 line-clamp-1">{asset.name}</p>
                          {asset.linear?.routeCode && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Route: {asset.linear.routeCode}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {asset.classCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          <p className="font-medium text-slate-700">{(asset.divisionId as any)?.name || 'Division'}</p>
                          <p className="text-[10px] text-slate-400">{asset.districtCode}</p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
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
                          >
                            {asset.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              asset.conditionScore <= 1
                                ? 'bg-rose-100 text-rose-800'
                                : asset.conditionScore <= 2
                                ? 'bg-orange-100 text-orange-800'
                                : asset.conditionScore <= 3
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {asset.condition || 'Score ' + asset.conditionScore}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-700">
                          {asset.classCode === 'BRG' && asset.riskScore !== null && (
                            <span className="text-amber-600">Risk {asset.riskScore}</span>
                          )}
                          {asset.classCode === 'SEG' && asset.priorityScore !== null && (
                            <span className="text-emerald-700">P-Score {asset.priorityScore}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link href={`/assets/${asset.assetId}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} total assets)
              </span>
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchAssets(pagination.page - 1)}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchAssets(pagination.page + 1)}
                  className="h-8 px-2 text-xs"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
