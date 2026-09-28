'use client';

import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Layers, Navigation } from 'lucide-react';
import { CONDITION_COLORS, RISK_COLORS } from '@/lib/constants';

// Fix standard Leaflet default icon URLs in Next.js
const customMarkerIcon = (color = '#059669') =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

interface MapProps {
  assets?: any[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  isInteractiveDrawing?: boolean;
  drawingMode?: 'POINT' | 'LINE' | 'POLYGON';
  onLocationSelected?: (coords: any) => void;
  singleGeometry?: any;
}

function MapClickHandler({
  drawingMode,
  onLocationSelected,
  capturedPoints,
  setCapturedPoints,
}: {
  drawingMode?: 'POINT' | 'LINE' | 'POLYGON';
  onLocationSelected?: (coords: any) => void;
  capturedPoints: [number, number][];
  setCapturedPoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
}) {
  useMapEvents({
    click(e) {
      if (!onLocationSelected) return;
      const { lat, lng } = e.latlng;

      if (drawingMode === 'POINT') {
        const point = [lng, lat];
        setCapturedPoints([[lat, lng]]);
        onLocationSelected({ type: 'Point', coordinates: point });
      } else if (drawingMode === 'LINE') {
        const newPoints: [number, number][] = [...capturedPoints, [lat, lng]];
        setCapturedPoints(newPoints);
        const geojsonPoints = newPoints.map(([lt, lg]) => [lg, lt]);
        onLocationSelected({ type: 'LineString', coordinates: geojsonPoints });
      } else if (drawingMode === 'POLYGON') {
        const newPoints: [number, number][] = [...capturedPoints, [lat, lng]];
        setCapturedPoints(newPoints);
        const geojsonPoints = newPoints.map(([lt, lg]) => [lg, lt]);
        onLocationSelected({ type: 'Polygon', coordinates: [geojsonPoints] });
      }
    },
  });
  return null;
}

export function LeafletMap({
  assets = [],
  center = [23.0225, 72.5714], // Ahmedabad / Gujarat center
  zoom = 8,
  height = '420px',
  isInteractiveDrawing = false,
  drawingMode = 'POINT',
  onLocationSelected,
  singleGeometry,
}: MapProps) {
  const [mounted, setMounted] = useState(false);
  const [capturedPoints, setCapturedPoints] = useState<[number, number][]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="w-full bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-sm font-medium"
      >
        <div className="flex items-center space-x-2">
          <Layers className="h-5 w-5 animate-pulse text-emerald-600" />
          <span>Loading Gujarat Geographic GIS Map...</span>
        </div>
      </div>
    );
  }

  // Calculate dynamic center if single geometry given
  let mapCenter: [number, number] = center;
  if (singleGeometry) {
    if (singleGeometry.type === 'Point' && Array.isArray(singleGeometry.coordinates)) {
      mapCenter = [singleGeometry.coordinates[1], singleGeometry.coordinates[0]];
    } else if (singleGeometry.type === 'LineString' && Array.isArray(singleGeometry.coordinates[0])) {
      mapCenter = [singleGeometry.coordinates[0][1], singleGeometry.coordinates[0][0]];
    }
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={singleGeometry ? 13 : zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | RNB Gujarat'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {isInteractiveDrawing && (
          <MapClickHandler
            drawingMode={drawingMode}
            onLocationSelected={onLocationSelected}
            capturedPoints={capturedPoints}
            setCapturedPoints={setCapturedPoints}
          />
        )}

        {/* Render interactive drawn line/points */}
        {isInteractiveDrawing && capturedPoints.length > 0 && (
          <>
            {drawingMode === 'POINT' && (
              <Marker position={capturedPoints[0]} icon={customMarkerIcon('#059669')} />
            )}
            {drawingMode === 'LINE' && (
              <Polyline positions={capturedPoints} pathOptions={{ color: '#059669', weight: 5, opacity: 0.85 }} />
            )}
            {drawingMode === 'POLYGON' && (
              <Polygon positions={capturedPoints} pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.3 }} />
            )}
          </>
        )}

        {/* Render Single Geometry preview */}
        {singleGeometry && !isInteractiveDrawing && (
          <>
            {singleGeometry.type === 'Point' && (
              <Marker
                position={[singleGeometry.coordinates[1], singleGeometry.coordinates[0]]}
                icon={customMarkerIcon('#059669')}
              />
            )}
            {singleGeometry.type === 'LineString' && (
              <Polyline
                positions={singleGeometry.coordinates.map((c: number[]) => [c[1], c[0]])}
                pathOptions={{ color: '#059669', weight: 6, opacity: 0.9 }}
              />
            )}
          </>
        )}

        {/* Render Assets Array */}
        {assets.map((asset) => {
          if (!asset.geometry || !asset.geometry.coordinates) return null;

          // Road Segments as Lines
          if (asset.geometry.type === 'LineString') {
            const positions = asset.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
            let color = '#22c55e'; // Green
            if (asset.conditionScore <= 1 || asset.status === 'CLOSED') color = '#ef4444';
            else if (asset.conditionScore <= 2) color = '#f97316';
            else if (asset.conditionScore <= 3) color = '#eab308';

            return (
              <Polyline
                key={asset._id || asset.assetId}
                positions={positions}
                pathOptions={{ color, weight: 6, opacity: 0.85 }}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{asset.assetId}</span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: color }}
                      >
                        {asset.condition || 'Score ' + asset.conditionScore}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{asset.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Route: {asset.linear?.routeCode || 'SH'} · Length: {((asset.linear?.lengthM || 0) / 1000).toFixed(1)} km
                    </p>
                    <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">{asset.status}</span>
                      <Link href={`/assets/${asset.assetId}`}>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 py-0">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          }

          // Points (Bridges, Buildings, Machinery, Land)
          if (asset.geometry.type === 'Point') {
            const lat = asset.geometry.coordinates[1];
            const lng = asset.geometry.coordinates[0];
            if (isNaN(lat) || isNaN(lng)) return null;

            let color = '#059669';
            if (asset.classCode === 'BRG') {
              if (asset.riskScore >= 75 || asset.operationalStatus === 'CLOSED') color = '#ef4444';
              else if (asset.riskScore >= 50 || asset.operationalStatus === 'RESTRICTED') color = '#f97316';
              else if (asset.riskScore >= 25) color = '#eab308';
              else color = '#22c55e';
            } else if (asset.status === 'UNSAFE' || asset.conditionScore <= 1) {
              color = '#ef4444';
            }

            return (
              <Marker key={asset._id || asset.assetId} position={[lat, lng]} icon={customMarkerIcon(color)}>
                <Popup>
                  <div className="p-1 space-y-1.5 min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{asset.assetId}</span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: color }}
                      >
                        {asset.classCode} · {asset.condition || 'GOOD'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800">{asset.name}</p>
                    {asset.classCode === 'BRG' && (
                      <p className="text-[11px] text-slate-500">
                        Risk Score: <strong className="text-slate-800">{asset.riskScore || 0}/100</strong> · Status: {asset.operationalStatus || asset.status}
                      </p>
                    )}
                    <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">{asset.status}</span>
                      <Link href={`/assets/${asset.assetId}`}>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 py-0">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          }

          return null;
        })}
      </MapContainer>
    </div>
  );
}
export default LeafletMap;
