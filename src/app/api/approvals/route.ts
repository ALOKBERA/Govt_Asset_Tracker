import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { ApprovalRequest } from '@/models/ApprovalRequest';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import {
  getSessionUser,
  unauthorized,
  serverError,
} from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';

    const query: Record<string, any> = {};
    if (status) query.status = status;

    // Filter by required role level if appropriate
    const approvals = await ApprovalRequest.find(query)
      .populate('assetId', 'name assetId classCode status condition divisionId')
      .populate('requesterId', 'name role email')
      .sort({ createdAt: -1 })
      .lean();

    // Also fetch unratified emergency safety events
    const unratifiedEvents = await AssetEvent.find({
      type: 'SAFETY_CLOSURE',
      'data.requiresRatification': true,
      'data.ratified': { $ne: true },
    })
      .populate('assetId', 'name assetId classCode status condition divisionId')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        approvals,
        unratifiedEvents,
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
