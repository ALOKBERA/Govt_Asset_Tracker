import { NextRequest, NextResponse } from 'next/server';
import { scanAndGenerateAlerts } from '@/lib/alerts';
import { serverError, unauthorized } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'rnb-asset-cron-secret-demo';

    if (authHeader !== `Bearer ${cronSecret}`) {
      // In development / demo allow bypass if no secret set
      if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        return unauthorized();
      }
    }

    const result = await scanAndGenerateAlerts();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
