'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Camera, AlertCircle } from 'lucide-react';
import { DEFECT_PRESETS, DefectSeverity } from '@/lib/constants';

export interface DefectItem {
  type: string;
  severity: DefectSeverity;
  location?: string;
  chainage?: string;
  note: string;
  photoUrl?: string;
  contractorLiable: boolean;
}

interface DefectPickerProps {
  classCode: string;
  isDlpActive?: boolean;
  defects: DefectItem[];
  onChange: (defects: DefectItem[]) => void;
}

export function DefectPicker({
  classCode,
  isDlpActive = false,
  defects = [],
  onChange,
}: DefectPickerProps) {
  const [currentType, setCurrentType] = useState('');
  const [currentSeverity, setCurrentSeverity] = useState<DefectSeverity>('MEDIUM');
  const [currentChainage, setCurrentChainage] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [currentPhoto, setCurrentPhoto] = useState('');
  const [contractorLiable, setContractorLiable] = useState(isDlpActive);

  const presets = DEFECT_PRESETS[classCode] || DEFECT_PRESETS['RDS'];

  const handleAddDefect = () => {
    if (!currentType.trim()) return;

    const newDefect: DefectItem = {
      type: currentType.trim(),
      severity: currentSeverity,
      chainage: currentChainage.trim() || undefined,
      location: currentLocation.trim() || undefined,
      note: currentNote.trim(),
      photoUrl: currentPhoto.trim() || undefined,
      contractorLiable: isDlpActive ? true : contractorLiable,
    };

    onChange([...defects, newDefect]);

    // Reset inputs
    setCurrentType('');
    setCurrentSeverity('MEDIUM');
    setCurrentChainage('');
    setCurrentLocation('');
    setCurrentNote('');
    setCurrentPhoto('');
  };

  const handleRemove = (index: number) => {
    const updated = defects.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span>Defect Logging & Observations</span>
        </h4>
        <span className="text-xs font-semibold text-slate-500">
          {defects.length} defect(s) added
        </span>
      </div>

      {isDlpActive && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900 flex items-center space-x-2">
          <span className="font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
            DLP Active
          </span>
          <span>Defects automatically flagged as <strong>Contractor Liable</strong>.</span>
        </div>
      )}

      {/* Preset Chips */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-500">Select Defect Type Presets:</p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setCurrentType(p)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                currentType === p
                  ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div>
          <label className="text-[11px] font-semibold text-slate-700">Defect Type / Title</label>
          <Input
            placeholder="e.g. Severe Pothole / Bearing Spall"
            value={currentType}
            onChange={(e) => setCurrentType(e.target.value)}
            className="h-9 text-xs mt-1"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700">Severity</label>
          <div className="grid grid-cols-4 gap-1.5 mt-1">
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as DefectSeverity[]).map((sev) => (
              <button
                type="button"
                key={sev}
                onClick={() => setCurrentSeverity(sev)}
                className={`text-[11px] py-1.5 rounded-md font-bold transition-all ${
                  currentSeverity === sev
                    ? sev === 'CRITICAL'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : sev === 'HIGH'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : sev === 'MEDIUM'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700">Chainage / Specific Location</label>
          <Input
            placeholder="e.g. Km 14+250 or Pier 3 Left"
            value={currentChainage || currentLocation}
            onChange={(e) => {
              setCurrentChainage(e.target.value);
              setCurrentLocation(e.target.value);
            }}
            className="h-9 text-xs mt-1"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-700">Defect Photo URL / Evidence</label>
          <Input
            placeholder="https://... or photo reference"
            value={currentPhoto}
            onChange={(e) => setCurrentPhoto(e.target.value)}
            className="h-9 text-xs mt-1"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold text-slate-700">Field Notes / Extent</label>
          <Input
            placeholder="e.g. 2m x 1.5m area, depth 80mm with exposed aggregate"
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            className="h-9 text-xs mt-1"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          size="sm"
          onClick={handleAddDefect}
          disabled={!currentType.trim()}
          className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Defect to Inspection
        </Button>
      </div>

      {/* Added Defects List */}
      {defects.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            Logged Defects in this Inspection:
          </p>
          {defects.map((d, index) => (
            <div
              key={index}
              className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                      d.severity === 'CRITICAL'
                        ? 'bg-rose-600'
                        : d.severity === 'HIGH'
                        ? 'bg-orange-500'
                        : d.severity === 'MEDIUM'
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {d.severity}
                  </span>
                  <span className="font-bold text-slate-900">{d.type}</span>
                  {(d.chainage || d.location) && (
                    <span className="text-slate-500 text-[11px]">({d.chainage || d.location})</span>
                  )}
                  {d.contractorLiable && (
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded">
                      Contractor Liable
                    </span>
                  )}
                </div>
                {d.note && <p className="text-slate-600 text-[11px]">{d.note}</p>}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="h-7 w-7 text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
