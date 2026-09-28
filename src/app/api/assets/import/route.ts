import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { OrgUnit } from '@/models/OrgUnit';
import { AssetEvent } from '@/models/AssetEvent';
import { getSessionUser, unauthorized, forbidden, badRequest, serverError } from '@/lib/rbac';
import { generateAssetId } from '@/lib/ids';
import { computeEventHash } from '@/lib/hash';
import type { ClassCode } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (user.role === 'AUDITOR' || user.role === 'FIELD_ENGINEER') return forbidden();

    const body = await req.json();
    const { csvText, defaultSubdivisionId, defaultDivisionId, defaultCircleId, defaultDistrictCode } = body;

    if (!csvText || typeof csvText !== 'string') {
      return badRequest('CSV text is required');
    }

    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return badRequest('Failed to parse CSV', parsed.errors);
    }

    const rows = parsed.data as Record<string, string>[];
    const results: { imported: number; failed: number; errors: { row: number; error: string }[]; assets: any[] } = {
      imported: 0,
      failed: 0,
      errors: [],
      assets: [],
    };

    await connectDB();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        const name = row.name || row.Name || row['Asset Name'];
        const classCode = (row.classCode || row['Class Code'] || 'RDS').toUpperCase() as ClassCode;
        const districtCode = (row.districtCode || defaultDistrictCode || 'AHM').toUpperCase();

        if (!name) {
          results.failed++;
          results.errors.push({ row: rowNum, error: 'Missing asset name' });
          continue;
        }

        const subId = row.subdivisionId || defaultSubdivisionId || user.subdivisionId;
        const divId = row.divisionId || defaultDivisionId || user.divisionId;
        const circId = row.circleId || defaultCircleId || user.circleId;

        if (!divId || !subId || !circId) {
          results.failed++;
          results.errors.push({ row: rowNum, error: 'Missing division/subdivision ID' });
          continue;
        }

        const assetId = await generateAssetId(classCode, districtCode);
        const cost = parseFloat(row.cost || row['Construction Cost'] || '0') || 0;
        const year = parseInt(row.year || row['Construction Year'] || '2020') || 2020;

        const asset = await Asset.create({
          assetId,
          name,
          classCode,
          subType: row.subType || row['Sub Type'] || '',
          attributes: {
            importedFromCsv: true,
            notes: row.notes || row.remarks || '',
          },
          subdivisionId: subId,
          divisionId: divId,
          circleId: circId,
          districtCode,
          status: 'IN_SERVICE', // Legacy imported assets go in as IN_SERVICE
          conditionScore: parseInt(row.conditionScore || '4') || 4,
          condition: row.condition || 'GOOD',
          acquisition: { cost, year },
          tagStatus: 'TAG_PENDING',
        });

        // Log legacy creation event
        const now = new Date();
        const payload = {
          assetCode: assetId,
          type: 'LEGACY_IMPORT',
          toStatus: 'IN_SERVICE',
          description: `Legacy asset imported from CSV by ${user.name}`,
          userId: user.id,
          userName: user.name,
          createdAtTimestamp: now.getTime(),
          data: { rowNumber: rowNum },
        };

        await AssetEvent.create({
          assetId: asset._id,
          assetCode: assetId,
          type: 'LEGACY_IMPORT',
          toStatus: 'IN_SERVICE',
          description: payload.description,
          data: payload.data,
          userId: user.id,
          userName: user.name,
          prevHash: 'GENESIS',
          hash: computeEventHash('GENESIS', payload),
        });

        results.imported++;
        results.assets.push(asset);
      } catch (err: any) {
        results.failed++;
        results.errors.push({ row: rowNum, error: err.message });
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return serverError(error.message);
  }
}
