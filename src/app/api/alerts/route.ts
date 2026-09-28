import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Alert } from '@/models/Alert';
import { getSessionUser, unauthorized, serverError } from '@/lib/rbac';
import { scanAndGenerateAlerts } from '@/lib/alerts';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const resolved = searchParams.get('resolved') === 'true';

    const query: Record<string, any> = { isResolved: resolved };
    if (user.role === 'DIVISION_ENGINEER' && user.divisionId) {
      query.divisionId = user.divisionId;
    } else if (user.role === 'CIRCLE_ADMIN' && user.circleId) {
      query.circleId = user.circleId;
    }

    const alerts = await Alert.find(query)
      .populate('assetId', 'name assetId classCode status condition')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, data: alerts });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const result = await scanAndGenerateAlerts();
    return NextResponse.json({
      success: true,
      message: `Alerts refreshed: ${result.generated} new alerts generated, ${result.totalActive} active total.`,
      data: result,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
