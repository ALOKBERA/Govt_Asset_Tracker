'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { MapContainerWrapper } from '@/components/map/MapContainerWrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Printer,
  Building,
  Road,
  FileText,
  RotateCcw,
} from 'lucide-react';
import {
  CLASS_CODES,
  CLASS_LABELS,
  DISTRICT_CODES,
  SURFACE_TYPES,
  BRIDGE_TYPES,
  BUILDING_TYPES,
  LAND_PURPOSES,
  ROAD_CATEGORIES,
  type ClassCode,
} from '@/lib/constants';
import { parseChainage, formatChainage } from '@/lib/chainage';

export default function NewAssetPage() {
  const router = useRouter();

  // Wizard Steps
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [classCode, setClassCode] = useState<string>('BRG');

  // Form Fields
  const [name, setName] = useState('');
  const [subType, setSubType] = useState('');
  const [districtCode, setDistrictCode] = useState('VAD');
  const [districtName, setDistrictName] = useState('Vadodara');
  const [subdivisionId, setSubdivisionId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [circleId, setCircleId] = useState('');

  // Linear Fields (for roads & segments)
  const [routeCode, setRouteCode] = useState('SH-4');
  const [startChainageStr, setStartChainageStr] = useState('0+000');
  const [endChainageStr, setEndChainageStr] = useState('5+000');
  const [parentAssetId, setParentAssetId] = useState('');

  // Geometry
  const [geometry, setGeometry] = useState<any>(null);

  // Acquisition & Construction
  const [cost, setCost] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [sanctionNo, setSanctionNo] = useState('');
  const [fundingScheme, setFundingScheme] = useState('State Highway Plan (GSB)');

  // Class-specific Attributes
  const [attributes, setAttributes] = useState<Record<string, any>>({});

  // Org Units list for selection
  const [orgUnits, setOrgUnits] = useState<any[]>([]);
  const [existingRoads, setExistingRoads] = useState<any[]>([]);

  // State & Result
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdAsset, setCreatedAsset] = useState<any>(null);

  useEffect(() => {
    fetch('/api/org-units')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setOrgUnits(json.data);
          const defaultSub = json.data.find((o: any) => o.type === 'SUBDIVISION');
          if (defaultSub) {
            setSubdivisionId(defaultSub._id);
            setDivisionId(defaultSub.parentId || '');
          }
          const defaultCircle = json.data.find((o: any) => o.type === 'CIRCLE');
          if (defaultCircle) setCircleId(defaultCircle._id);
        }
      });

    fetch('/api/assets?classCode=RDS&limit=100')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setExistingRoads(json.data);
      });
  }, []);

  const handleDistrictChange = (dist: string) => {
    setDistrictName(dist);
    setDistrictCode(DISTRICT_CODES[dist] || 'VAD');
  };

  const handleLocationCaptured = (geo: any) => {
    setGeometry(geo);
  };

  const handleRegisterSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      // Calculate linear chainages if road or segment
      let linearData = undefined;
      if (classCode === 'RDS' || classCode === 'SEG') {
        const sM = parseChainage(startChainageStr);
        const eM = parseChainage(endChainageStr);
        linearData = {
          routeCode,
          startChainageM: sM,
          endChainageM: eM,
          lengthM: Math.max(0, eM - sM),
        };
      }

      const payload = {
        name,
        classCode,
        subType,
        districtCode,
        subdivisionId,
        divisionId,
        circleId,
        parentAssetId: parentAssetId || undefined,
        linear: linearData,
        geometry: geometry || (classCode === 'BRG' || classCode === 'BLD' ? { type: 'Point', coordinates: [73.1812, 22.3072] } : null),
        acquisition: {
          cost: parseFloat(cost) || 0,
          year: parseInt(year) || new Date().getFullYear(),
          sanctionNo,
          fundingScheme,
        },
        attributes,
        status: 'SANCTIONED',
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to register asset');
      }

      setCreatedAsset(json.data);
      setStep(4); // Success step
    } catch (err: any) {
      setError(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Wizard Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900">New Asset Registration Wizard</h1>
            <p className="text-xs text-slate-500 font-medium">
              Permanent identification, GPS coordinates, chainage mapping, and initial lifecycle creation
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className={`px-2.5 py-1 rounded-full ${step === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              1. Class
            </span>
            <span>&rarr;</span>
            <span className={`px-2.5 py-1 rounded-full ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              2. Details
            </span>
            <span>&rarr;</span>
            <span className={`px-2.5 py-1 rounded-full ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              3. GIS Location
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Select Class */}
        {step === 1 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Select Asset Category Template</CardTitle>
              <CardDescription className="text-xs">
                Pick the asset type to load Gujarat R&B class-specific fields and inspection rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { code: 'RDS', label: 'Road (Parent Corridor)', icon: Road, desc: 'SH, MDR, ODR, VR Route links' },
                  { code: 'SEG', label: 'Road Segment (Child)', icon: Layers, desc: 'Homogeneous chainage stretch with geometry' },
                  { code: 'BRG', label: 'Bridge / Structure', icon: Building, desc: 'Major, Minor, Culverts, ROB/RUB with IBMS ID' },
                  { code: 'BLD', label: 'Public Building', icon: Building, desc: 'Offices, Hospitals, Quarters, Circuit houses' },
                  { code: 'LND', label: 'Land', icon: MapPin, desc: 'Acquired khasra survey parcels & quarry plots' },
                  // MCH (Machinery & Equipment) hidden from UI — backend model & logic intact
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = classCode === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setClassCode(item.code)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{item.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-slate-100 pt-4">
              <Button onClick={() => setStep(2)} className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold">
                Continue to Asset Details <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: Basic & Class-Specific Details */}
        {step === 2 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Enter {CLASS_LABELS[classCode as ClassCode]} Specification
              </CardTitle>
              <CardDescription className="text-xs">
                Fill in official sanction particulars, jurisdiction, and technical attributes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Official Asset Name / Title *</label>
                  <Input
                    placeholder={
                      classCode === 'BRG'
                        ? 'e.g. Major Bridge across Vishwamitri River on SH-4'
                        : classCode === 'RDS'
                        ? 'e.g. Ahmedabad - Gandhinagar Highway (SH-4)'
                        : 'e.g. Vadodara District Hospital Main Block'
                    }
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-9 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Physical District *</label>
                  <select
                    value={districtName}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.keys(DISTRICT_CODES).map((d) => (
                      <option key={d} value={d}>
                        {d} ({DISTRICT_CODES[d]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Sub-Type</label>
                  <select
                    value={subType}
                    onChange={(e) => setSubType(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Sub-Type</option>
                    {classCode === 'BRG' &&
                      BRIDGE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    {classCode === 'BLD' &&
                      BUILDING_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    {classCode === 'RDS' &&
                      ROAD_CATEGORIES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Linear fields if road or segment */}
                {(classCode === 'RDS' || classCode === 'SEG') && (
                  <>
                    {classCode === 'SEG' && (
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Parent Road Corridor *</label>
                        <select
                          value={parentAssetId}
                          onChange={(e) => setParentAssetId(e.target.value)}
                          className="mt-1 flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Select Parent Road</option>
                          {existingRoads.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.assetId} - {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-slate-700">Route Code</label>
                      <Input
                        value={routeCode}
                        onChange={(e) => setRouteCode(e.target.value)}
                        placeholder="e.g. SH-4 / MDR-12"
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-700">Start Chainage</label>
                        <Input
                          value={startChainageStr}
                          onChange={(e) => setStartChainageStr(e.target.value)}
                          placeholder="0+000"
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700">End Chainage</label>
                        <Input
                          value={endChainageStr}
                          onChange={(e) => setEndChainageStr(e.target.value)}
                          placeholder="5+000"
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Construction & Cost */}
                <div>
                  <label className="text-xs font-semibold text-slate-700">Estimated / Sanction Cost (₹)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 25000000"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Construction / Procurement Year</label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Administrative Sanction No.</label>
                  <Input
                    placeholder="e.g. RNB/AA/2026/VAD/045"
                    value={sanctionNo}
                    onChange={(e) => setSanctionNo(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Funding Scheme</label>
                  <Input
                    placeholder="e.g. State Highway Plan / NABARD RIDF"
                    value={fundingScheme}
                    onChange={(e) => setFundingScheme(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                {/* Class Specific Attributes */}
                {classCode === 'BRG' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">River / Obstacle Crossed</label>
                      <Input
                        placeholder="e.g. Mahi River / Railway Line"
                        onChange={(e) => setAttributes({ ...attributes, riverObstacle: e.target.value })}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">IBMS Bridge Reference ID</label>
                      <Input
                        placeholder="e.g. IBMS-GJ-VAD-084"
                        onChange={(e) => setAttributes({ ...attributes, ibmsBridgeId: e.target.value })}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </>
                )}

                {classCode === 'BLD' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Occupant Department</label>
                      <Input
                        placeholder="e.g. Health & Family Welfare Department"
                        onChange={(e) => setAttributes({ ...attributes, occupantDepartment: e.target.value })}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Built-up / Plinth Area (sq.m)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 4500"
                        onChange={(e) => setAttributes({ ...attributes, plinthArea: parseFloat(e.target.value) })}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(3)}
                disabled={!name.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold"
              >
                Proceed to GIS Mapping <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: GIS Location Capture */}
        {step === 3 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">GIS Location & Geometry Capture</CardTitle>
              <CardDescription className="text-xs">
                Click on the map to place the asset location pin (or click multiple points to draw road segment alignment).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                <span>
                  {classCode === 'RDS' || classCode === 'SEG'
                    ? 'Click multiple points along the highway to draw the alignment.'
                    : 'Click once on the map to place the exact location pin.'}
                </span>
                <span className="font-bold">
                  {geometry ? 'Geometry Captured' : 'Click Map to Place'}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <MapContainerWrapper
                  height="400px"
                  isInteractiveDrawing={true}
                  drawingMode={classCode === 'RDS' || classCode === 'SEG' ? 'LINE' : 'POINT'}
                  onLocationSelected={handleLocationCaptured}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
              <Button variant="outline" size="sm" onClick={() => setStep(2)} className="text-xs">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
              <Button
                size="sm"
                onClick={handleRegisterSubmit}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold shadow-md"
              >
                {submitting ? 'Generating ID & Registering...' : 'Confirm & Register Asset'}
                <CheckCircle2 className="h-4 w-4 ml-1.5" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 4: Success Screen with ID & Label */}
        {step === 4 && createdAsset && (
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white shadow-xl text-center p-6 space-y-5">
            <div className="inline-flex h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900">Asset Registered Successfully!</h2>
              <p className="text-xs text-slate-500">
                Immutable Asset Identification Code generated and anchored in SHA-256 audit ledger.
              </p>
            </div>

            <div className="p-4 bg-white border-2 border-emerald-500 rounded-xl inline-block shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Generated Official Asset ID</p>
              <p className="text-xl font-mono font-black text-emerald-800">{createdAsset.assetId}</p>
              <p className="text-xs font-semibold text-slate-700 mt-1">{createdAsset.name}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href={`/assets/${createdAsset.assetId}/label`} target="_blank">
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-xs font-semibold shadow">
                  <Printer className="h-4 w-4 mr-1.5" />
                  Print QR Identification Tag
                </Button>
              </Link>

              <Link href={`/assets/${createdAsset.assetId}`}>
                <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold">
                  View Asset Dashboard & Lifecycle &rarr;
                </Button>
              </Link>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setName('');
                  setCreatedAsset(null);
                }}
                className="text-xs"
              >
                Register Another Asset
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
