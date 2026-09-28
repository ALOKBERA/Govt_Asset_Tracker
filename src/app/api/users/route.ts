import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { OrgUnit } from '@/models/OrgUnit';
import { getSessionUser, badRequest, serverError, forbidden, unauthorized } from '@/lib/rbac';
import { UserRegisterSchema } from '@/lib/validators';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (user.role !== 'STATE_ADMIN' && user.role !== 'CIRCLE_ADMIN') return forbidden();

    await connectDB();
    const users = await User.find({})
      .select('-password')
      .populate('orgUnitId', 'name type code')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return unauthorized();
    if (sessionUser.role !== 'STATE_ADMIN') return forbidden();

    const body = await req.json();
    const parsed = UserRegisterSchema.safeParse(body);
    if (!parsed.success) return badRequest('Validation failed', parsed.error.format());

    await connectDB();
    const existing = await User.findOne({ email: parsed.data.email.toLowerCase() });
    if (existing) return badRequest('User email already exists');

    // Resolve org unit hierarchy for fast scoping
    const org = await OrgUnit.findById(parsed.data.orgUnitId);
    if (!org) return badRequest('OrgUnit not found');

    let subdivisionId = parsed.data.subdivisionId;
    let divisionId = parsed.data.divisionId;
    let circleId = parsed.data.circleId;
    let wingId = parsed.data.wingId;

    if (org.type === 'SUBDIVISION') {
      subdivisionId = org._id.toString();
      if (org.parentId) {
        const div = await OrgUnit.findById(org.parentId);
        if (div) {
          divisionId = div._id.toString();
          if (div.parentId) circleId = div.parentId.toString();
        }
      }
    } else if (org.type === 'DIVISION') {
      divisionId = org._id.toString();
      if (org.parentId) circleId = org.parentId.toString();
    } else if (org.type === 'CIRCLE') {
      circleId = org._id.toString();
      if (org.parentId) wingId = org.parentId.toString();
    } else if (org.type === 'WING') {
      wingId = org._id.toString();
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

    const newUser = await User.create({
      email: parsed.data.email.toLowerCase(),
      password: hashedPassword,
      name: parsed.data.name,
      role: parsed.data.role,
      orgUnitId: org._id,
      subdivisionId,
      divisionId,
      circleId,
      wingId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return serverError(error.message);
  }
}
