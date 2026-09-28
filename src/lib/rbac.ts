import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import type { Role } from './constants';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgUnitId: string;
  subdivisionId?: string;
  divisionId?: string;
  circleId?: string;
  wingId?: string;
}

// Get authenticated user or return 401
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Role hierarchy (higher index = more privilege)
const ROLE_HIERARCHY: Record<Role, number> = {
  FIELD_ENGINEER: 0,
  SUBDIVISION_ENGINEER: 1,
  DIVISION_ENGINEER: 2,
  CIRCLE_ADMIN: 3,
  STATE_ADMIN: 4,
  AUDITOR: 5, // Read-only across scope
};

// Check if a role has at least the required level
export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  if (userRole === 'AUDITOR') {
    // Auditor can only read, cannot perform admin actions
    return requiredRole === 'AUDITOR';
  }
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Check role permissions
export function checkRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

// Build scoped query filter based on user's role and org unit
export function buildScopeFilter(user: SessionUser): Record<string, unknown> {
  switch (user.role) {
    case 'STATE_ADMIN':
    case 'AUDITOR':
      // Can see everything
      return {};
    case 'CIRCLE_ADMIN':
      return { circleId: user.circleId };
    case 'DIVISION_ENGINEER':
      return { divisionId: user.divisionId };
    case 'SUBDIVISION_ENGINEER':
    case 'FIELD_ENGINEER':
      return { subdivisionId: user.subdivisionId };
    default:
      return { _id: null }; // No access
  }
}

// Check if user can access a specific asset/record based on its org units
export function canAccessRecord(
  user: SessionUser,
  record: { subdivisionId?: string; divisionId?: string; circleId?: string }
): boolean {
  switch (user.role) {
    case 'STATE_ADMIN':
    case 'AUDITOR':
      return true;
    case 'CIRCLE_ADMIN':
      return record.circleId === user.circleId;
    case 'DIVISION_ENGINEER':
      return record.divisionId === user.divisionId;
    case 'SUBDIVISION_ENGINEER':
    case 'FIELD_ENGINEER':
      return record.subdivisionId === user.subdivisionId;
    default:
      return false;
  }
}

// Check if user can write (auditors cannot)
export function canWrite(user: SessionUser): boolean {
  return user.role !== 'AUDITOR';
}

// Determine required approval level based on estimated value
export function getRequiredApprovalLevel(estimatedValue: number): Role {
  // Configurable thresholds (defaults)
  const THRESHOLD_A = 5000000;  // 50 Lakh → Division Engineer
  const THRESHOLD_B = 25000000; // 2.5 Crore → Circle Admin
  // Above B → State Admin

  if (estimatedValue <= THRESHOLD_A) return 'DIVISION_ENGINEER';
  if (estimatedValue <= THRESHOLD_B) return 'CIRCLE_ADMIN';
  return 'STATE_ADMIN';
}

// API response helpers
export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 });
}
