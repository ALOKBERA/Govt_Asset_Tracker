'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Layers, Shield, KeyRound, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const DEMO_USERS = [
  {
    role: 'STATE_ADMIN',
    name: 'Chief Engineer (HQ)',
    email: 'state@demo.gov',
    password: 'Password@123',
    unit: 'State HQ Gandhinagar',
    desc: 'Full administrative access across Gujarat',
  },
  {
    role: 'CIRCLE_ADMIN',
    name: 'Superintending Engineer (SE)',
    email: 'circle@demo.gov',
    password: 'Password@123',
    unit: 'Vadodara R&B Circle',
    desc: 'Approves high-value works & circle reports',
  },
  {
    role: 'DIVISION_ENGINEER',
    name: 'Executive Engineer (EE)',
    email: 'division@demo.gov',
    password: 'Password@123',
    unit: 'Vadodara Division',
    desc: 'Sanctions works, ratifies safety closures',
  },
  {
    role: 'SUBDIVISION_ENGINEER',
    name: 'Deputy Executive Engineer (DEE)',
    email: 'subdivision@demo.gov',
    password: 'Password@123',
    unit: 'Padra Sub-division',
    desc: 'Registers assets, requests approvals',
  },
  {
    role: 'FIELD_ENGINEER',
    name: 'Junior / Assistant Engineer (JE/AE)',
    email: 'field@demo.gov',
    password: 'Password@123',
    unit: 'Section Office',
    desc: 'Field inspections, defects & immediate safety actions',
  },
  {
    role: 'AUDITOR',
    name: 'Vigilance & Audit Officer',
    email: 'auditor@demo.gov',
    password: 'Password@123',
    unit: 'Quality Control & Audit Wing',
    desc: 'Read-only access with audit integrity checks',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('state@demo.gov');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error || 'Invalid credentials');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (user: typeof DEMO_USERS[0]) => {
    setEmail(user.email);
    setPassword(user.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Demo Banner */}
      <div className="max-w-4xl mx-auto w-full mb-6 bg-amber-500/20 border border-amber-500/40 rounded-xl p-3 text-amber-200 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            <strong>RNB AssetTrail Prototype</strong> · Roads and Buildings Department, Government of Gujarat.
          </span>
        </div>
        <span className="text-[11px] font-semibold bg-amber-500/30 px-2 py-0.5 rounded">
          Hackathon Edition
        </span>
      </div>

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Branding */}
        <div className="lg:col-span-5 text-white space-y-4 text-center lg:text-left">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 items-center justify-center shadow-lg shadow-emerald-500/30">
            <Layers className="h-8 w-8 text-white" />
          </div>
          <div>
            <div className="flex items-center justify-center lg:justify-start space-x-2">
              <h1 className="text-3xl font-extrabold tracking-tight">RNB AssetTrail</h1>
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                GUJARAT
              </span>
            </div>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Asset Registry & Full Lifecycle Management System
            </p>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            End-to-end infrastructure tracking: Roads & Chainage Segments, Bridges & Safety Watchlists, Public Buildings, Defect Liability Periods (DLP), and Pre/Post-Monsoon Inspections.
          </p>

          <div className="pt-2 space-y-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Server-enforced RBAC & Unit Scoping</span>
            </div>
            <div className="flex items-center space-x-2">
              <KeyRound className="h-4 w-4 text-teal-400" />
              <span>SHA-256 Hash-Chained Audit Trail</span>
            </div>
          </div>
        </div>

        {/* Right Form */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-700 bg-white/95 backdrop-blur-md shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-slate-900">Sign in to Department Portal</CardTitle>
              <CardDescription className="text-xs">
                Select a demo persona below or enter your official credentials
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Official Email</label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-9 text-xs"
                    placeholder="officer@demo.gov"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 h-9 text-xs"
                    placeholder="••••••••"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Portal'}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </form>

              {/* Quick Persona Picker */}
              <div className="pt-3 border-t border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  1-Click Demo Personas (Pre-seeded with unit scopes):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEMO_USERS.map((u) => {
                    const isSelected = email === u.email;
                    return (
                      <button
                        key={u.role}
                        type="button"
                        onClick={() => handleSelectDemoUser(u)}
                        className={`text-left p-2 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900">{u.name}</span>
                          {isSelected && <UserCheck className="h-3.5 w-3.5 text-emerald-600" />}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">{u.unit}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate">{u.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
