import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { OrgUnit } from '@/models/OrgUnit';
import { getSessionUser, badRequest, serverError, forbidden, unauthorized } from '@/lib/rbac';
import { OrgUnitSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const parentId = searchParams.get('parentId');

    const query: Record<string, unknown> = { isActive: true };
    if (type) query.type = type;
    if (parentId) query.parentId = parentId;

    const orgUnits = await OrgUnit.find(query).sort({ type: 1, name: 1 }).lean();
    return NextResponse.json({ success: true, data: orgUnits });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (user.role !== 'STATE_ADMIN') return forbidden();

    const body = await req.json();
    const parsed = OrgUnitSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid org unit data', parsed.error.format());

    await connectDB();
    const existing = await OrgUnit.findOne({ code: parsed.data.code.toUpperCase() });
    if (existing) return badRequest(`OrgUnit code ${parsed.data.code} already exists`);

    const orgUnit = await OrgUnit.create({
      ...parsed.data,
      code: parsed.data.code.toUpperCase(),
    });

    return NextResponse.json({ success: true, data: orgUnit }, { status: 201 });
  } catch (error: any) {
    return serverError(error.message);
  }
}
