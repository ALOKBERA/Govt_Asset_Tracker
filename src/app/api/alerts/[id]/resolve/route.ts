import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Alert } from '@/models/Alert';
import { getSessionUser, notFound, unauthorized, serverError } from '@/lib/rbac';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    await connectDB();

    const alert = await Alert.findById(id);
    if (!alert) return notFound('Alert not found');

    alert.isResolved = true;
    alert.resolvedBy = user.id as any;
    alert.resolvedAt = new Date();
    await alert.save();

    return NextResponse.json({
      success: true,
      message: 'Alert marked as resolved',
      data: alert,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
