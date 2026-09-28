import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Work } from '@/models/Work';
import { getSessionUser, notFound, unauthorized, forbidden, serverError, canWrite } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    await connectDB();

    const work = await Work.findById(id)
      .populate('assetId', 'name assetId classCode status condition')
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .lean();

    if (!work) return notFound('Work not found');
    return NextResponse.json({ success: true, data: work });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user)) return forbidden();

    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const work = await Work.findById(id);
    if (!work) return notFound('Work not found');

    Object.assign(work, body);
    await work.save();

    return NextResponse.json({ success: true, data: work });
  } catch (error: any) {
    return serverError(error.message);
  }
}
