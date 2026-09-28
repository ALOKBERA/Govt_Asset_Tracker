'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Settings, Shield, Layers, Users, Sliders, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [orgUnits, setOrgUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [thresholdA, setThresholdA] = useState('5000000'); // 50 Lakh
  const [thresholdB, setThresholdB] = useState('25000000'); // 2.5 Crore
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/org-units')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setOrgUnits(json.data);
      });

    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      });
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">System Configuration & Administrative Thresholds</h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage approval delegations, organizational units, inspection windows, and ID prefixes
            </p>
          </div>
          {saved && (
            <Badge variant="success" className="flex items-center space-x-1 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Settings Saved</span>
            </Badge>
          )}
        </div>

        {/* Approval Thresholds */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>Maker-Checker Approval Authority Thresholds</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Configurable financial limits determining the required approval role level.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700">
                    Threshold A (Executive Engineer Limit in ₹)
                  </label>
                  <Input
                    type="number"
                    value={thresholdA}
                    onChange={(e) => setThresholdA(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Proposals up to ₹{(parseInt(thresholdA) / 100000).toFixed(0)} Lakh handled by Executive Engineer
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">
                    Threshold B (Superintending Engineer Limit in ₹)
                  </label>
                  <Input
                    type="number"
                    value={thresholdB}
                    onChange={(e) => setThresholdB(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Proposals up to ₹{(parseInt(thresholdB) / 10000000).toFixed(2)} Crore handled by SE (Above B goes to Chief Engineer)
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold">
                  Save Thresholds
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Org Units Structure */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Users className="h-4 w-4 text-teal-600" />
              <span>Hierarchical Organizational Units ({orgUnits.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="max-h-60 overflow-y-auto space-y-1.5 text-xs">
              {orgUnits.map((u) => (
                <div key={u._id} className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{u.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 ml-2">({u.code})</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {u.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
