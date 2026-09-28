import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Category } from '@/models/Category';
import { getSessionUser, badRequest, serverError, forbidden, unauthorized } from '@/lib/rbac';

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find({}).sort({ classCode: 1 }).lean();
    return NextResponse.json({ success: true, data: categories });
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
    await connectDB();

    const category = await Category.create(body);
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    return serverError(error.message);
  }
}
