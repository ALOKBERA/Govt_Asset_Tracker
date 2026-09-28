import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { AssetEvent } from '@/models/AssetEvent';
import { Asset } from '@/models/Asset';
import { Alert } from '@/models/Alert';
import {
  getSessionUser,
  badRequest,
  notFound,
  unauthorized,
  forbidden,
  serverError,
  hasMinRole,
} from '@/lib/rbac';
import { computeEventHash } from '@/lib/hash';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    // Minimum role: DIVISION_ENGINEER (Executive Engineer)
    if (!hasMinRole(user.role, 'DIVISION_ENGINEER')) {
      return forbidden();
    }

    const { eventId } = await params;
    const body = await req.json();
    const note = body.note || 'Safety action ratified by Executive Engineer';

    await connectDB();
    const event = await AssetEvent.findById(eventId);
    if (!event) return notFound('Safety event not found');

    const asset = await Asset.findById(event.assetId);
    if (!asset) return notFound('Asset not found');

    // Update event data
    event.data = {
      ...(event.data || {}),
      ratified: true,
      ratifiedBy: user.name,
      ratifiedAt: new Date(),
      ratificationNote: note,
    };
    await event.save({ validateBeforeSave: false }); // Bypass immutable hook for subfield

    // Resolve unratified alert
    await Alert.updateOne(
      { dedupeKey: `RATIFICATION_NEEDED_${event._id}` },
      { $set: { isResolved: true, resolvedBy: user.id, resolvedAt: new Date() } }
    );

    // Append RATIFICATION event
    const lastEvent = await AssetEvent.findOne({ assetId: asset._id }).sort({ createdAt: -1 });
    const prevHash = lastEvent?.hash || 'GENESIS';
    const now = new Date();

    const eventPayload = {
      assetCode: asset.assetId,
      type: 'SAFETY_RATIFIED',
      description: `Emergency safety action (${event.toStatus}) ratified by ${user.name} (${user.role}). Note: ${note}`,
      userId: user.id,
      userName: user.name,
      createdAtTimestamp: now.getTime(),
      data: { safetyEventId: event._id, ratificationNote: note },
    };

    const newEvent = await AssetEvent.create({
      assetId: asset._id,
      assetCode: asset.assetId,
      type: 'SAFETY_RATIFIED',
      description: eventPayload.description,
      data: eventPayload.data,
      userId: user.id,
      userName: user.name,
      prevHash,
      hash: computeEventHash(prevHash, eventPayload),
    });

    return NextResponse.json({
      success: true,
      message: 'Safety action ratified successfully',
      data: newEvent,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
