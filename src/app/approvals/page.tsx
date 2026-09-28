'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Lock,
  Clock,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  Check,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [unratifiedEvents, setUnratifiedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Decision Modal State
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState('');

  // Ratification Modal State
  const [selectedEventToRatify, setSelectedEventToRatify] = useState<any>(null);
  const [ratifyNote, setRatifyNote] = useState('');
  const [ratifying, setRatifying] = useState(false);

  const fetchApprovalsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/approvals');
      const json = await res.json();
      if (json.success) {
        setApprovals(json.data.approvals || []);
        setUnratifiedEvents(json.data.unratifiedEvents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalsData();
  }, []);

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedApproval) return;
    setDeciding(true);
    setDecisionError('');

    try {
      const res = await fetch(`/api/approvals/${selectedApproval._id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          note: decisionNote || `Decision by ${(session?.user as any)?.name}`,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Decision failed');

      setSelectedApproval(null);
      setDecisionNote('');
      fetchApprovalsData();
    } catch (err: any) {
      setDecisionError(err.message);
    } finally {
      setDeciding(false);
    }
  };

  const handleRatifySafetyAction = async () => {
    if (!selectedEventToRatify) return;
    setRatifying(true);

    try {
      const res = await fetch(`/api/ratifications/${selectedEventToRatify._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: ratifyNote || 'Emergency closure ratified by Executive Engineer',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Ratification failed');

      setSelectedEventToRatify(null);
      setRatifyNote('');
      fetchApprovalsData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRatifying(false);
    }
  };

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const pastApprovals = approvals.filter((a) => a.status !== 'PENDING');

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900">Maker-Checker Authorization & Safety Ratification</h1>
              <Badge variant="warning" className="font-bold text-xs">
                {pendingApprovals.length} Pending Requests
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Strict maker-checker separation · Executive Engineer safety closure ratifications · Value-based approval delegation
            </p>
          </div>
        </div>

        {/* Tabbed Views */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-slate-100/90 border border-slate-200">
            <TabsTrigger value="pending">Pending Approvals ({pendingApprovals.length})</TabsTrigger>
            <TabsTrigger value="ratifications">
              Safety Ratifications ({unratifiedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="history">Decision Audit History ({pastApprovals.length})</TabsTrigger>
          </TabsList>

          {/* TAB 1: Pending Approvals */}
          <TabsContent value="pending">
            {pendingApprovals.length === 0 ? (
              <Card className="p-8 text-center text-slate-400 text-xs">
                No pending authorization requests for your review.
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingApprovals.map((appr) => {
                  const isRequester = (session?.user as any)?.id === appr.requesterId?._id?.toString() || (session?.user as any)?.id === appr.requesterId?.toString();
                  return (
                    <Card key={appr._id} className="border-slate-200 shadow-sm p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900">{appr.assetCode}</span>
                        <Badge variant="warning">{appr.type}</Badge>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-slate-800">{(appr.assetId as any)?.name || 'Asset'}</p>
                        <p className="text-slate-600">
                          Proposed by: <strong>{appr.requesterName}</strong> · Required Level: <strong className="text-emerald-700">{appr.requiredLevel}</strong>
                        </p>
                        <p className="text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{appr.reason}"
                        </p>
                        {appr.estimatedValue > 0 && (
                          <p className="text-[11px] text-slate-500">
                            Estimated Value: <strong className="text-slate-900">{formatCurrency(appr.estimatedValue)}</strong>
                          </p>
                        )}
                      </div>

                      {isRequester ? (
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500 text-[11px] flex items-center space-x-1.5 font-medium">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Maker-Checker: You created this request and cannot self-approve.</span>
                        </div>
                      ) : (
                        <div className="flex space-x-2 pt-2 border-t border-slate-100">
                          <Button
                            size="sm"
                            onClick={() => setSelectedApproval(appr)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Decide on Request
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Emergency Safety Closures Awaiting EE Ratification */}
          <TabsContent value="ratifications">
            <Card className="border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    <span>Immediate Safety Closures & Restrictions Awaiting EE Ratification</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Field engineers immediately restrict unsafe assets. Executive Engineers must formally ratify the order.
                  </p>
                </div>
              </div>

              {unratifiedEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  All emergency safety restrictions and closures have been ratified.
                </div>
              ) : (
                <div className="space-y-3">
                  {unratifiedEvents.map((ev) => (
                    <div
                      key={ev._id}
                      className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center justify-between text-xs hover:bg-rose-50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900">{ev.assetCode}</span>
                          <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded">
                            {ev.toStatus}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800">{ev.description}</p>
                        <p className="text-[11px] text-slate-500">
                          Action taken by: <strong className="text-slate-900">{ev.userName}</strong> on {formatDate(ev.createdAt)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setSelectedEventToRatify(ev)}
                        className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold shrink-0 ml-3"
                      >
                        Ratify Order
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TAB 3: Decision Audit History */}
          <TabsContent value="history">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Asset ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Requester</th>
                    <th className="py-3 px-4">Decision</th>
                    <th className="py-3 px-4">Decider</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastApprovals.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{a.assetCode}</td>
                      <td className="py-3 px-4 font-semibold">{a.type}</td>
                      <td className="py-3 px-4">{a.requesterName}</td>
                      <td className="py-3 px-4">
                        <Badge variant={a.status === 'APPROVED' ? 'success' : 'destructive'}>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{a.deciderName || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(a.decidedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Decision Dialog Modal */}
      <Dialog open={Boolean(selectedApproval)} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authorization Decision</DialogTitle>
            <DialogDescription className="text-xs">
              Review and record official decision on {selectedApproval?.assetCode}.
            </DialogDescription>
          </DialogHeader>

          {decisionError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg font-semibold">
              {decisionError}
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg space-y-1">
              <p><strong>Proposal:</strong> {selectedApproval?.type}</p>
              <p><strong>Reason:</strong> {selectedApproval?.reason}</p>
              <p><strong>Proposed By:</strong> {selectedApproval?.requesterName}</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Official Decision Note / Remarks *</label>
              <Input
                placeholder="e.g. Approved per administrative authority guidelines..."
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDecision('REJECTED')}
              disabled={deciding || !decisionNote.trim()}
              className="text-xs font-bold"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject Request
            </Button>
            <Button
              size="sm"
              onClick={() => handleDecision('APPROVED')}
              disabled={deciding || !decisionNote.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ratify Emergency Safety Action Modal */}
      <Dialog open={Boolean(selectedEventToRatify)} onOpenChange={() => setSelectedEventToRatify(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ratify Emergency Safety Action</DialogTitle>
            <DialogDescription className="text-xs">
              Executive Engineer formal order ratification for {selectedEventToRatify?.assetCode}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-1">
              <p className="font-bold">Immediate Action Description:</p>
              <p>{selectedEventToRatify?.description}</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Executive Engineer Order Remarks</label>
              <Input
                placeholder="e.g. Ratified. Tender for structural rehabilitation to be floated immediately."
                value={ratifyNote}
                onChange={(e) => setRatifyNote(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedEventToRatify(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRatifySafetyAction}
              disabled={ratifying}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
            >
              {ratifying ? 'Ratifying...' : 'Ratify & Issue Formal Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
