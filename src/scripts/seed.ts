import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { OrgUnit } from '../models/OrgUnit';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Asset } from '../models/Asset';
import { AssetEvent } from '../models/AssetEvent';
import { Work } from '../models/Work';
import { Inspection, InspectionDrive } from '../models/Inspection';
import { ApprovalRequest } from '../models/ApprovalRequest';
import { Alert, CitizenReport, Counter } from '../models/Alert';
import { computeEventHash } from '../lib/hash';
import { calculateBridgeRisk, calculateRoadPriority } from '../lib/scoring';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rnb_asset_trail_db';

async function seed() {
  console.log('🌱 Starting RNB AssetTrail Gujarat Database Seeder...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing collections
  await Promise.all([
    OrgUnit.deleteMany({}),
    User.deleteMany({}),
    Category.deleteMany({}),
    Asset.deleteMany({}),
    AssetEvent.deleteMany({}),
    Work.deleteMany({}),
    Inspection.deleteMany({}),
    InspectionDrive.deleteMany({}),
    ApprovalRequest.deleteMany({}),
    Alert.deleteMany({}),
    CitizenReport.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  console.log('Cleared existing collections');

  // 1. Seed OrgUnits Hierarchy
  // Wings
  const stateWing = await OrgUnit.create({
    type: 'WING',
    code: 'WING-STATE',
    name: 'State Roads & Buildings Wing (HQ)',
    parentId: null,
  });
  const panchayatWing = await OrgUnit.create({
    type: 'WING',
    code: 'WING-PANCHAYAT',
    name: 'Panchayat Roads Wing',
    parentId: null,
  });
  const nhWing = await OrgUnit.create({
    type: 'WING',
    code: 'WING-NH',
    name: 'National Highways Agency Wing',
    parentId: null,
  });

  // Circles
  const vadodaraCircle = await OrgUnit.create({
    type: 'CIRCLE',
    code: 'CIRC-VAD',
    name: 'Vadodara R&B Circle',
    parentId: stateWing._id,
  });
  const ahmedabadCircle = await OrgUnit.create({
    type: 'CIRCLE',
    code: 'CIRC-AHM',
    name: 'Ahmedabad R&B Circle',
    parentId: stateWing._id,
  });
  const rajkotCircle = await OrgUnit.create({
    type: 'CIRCLE',
    code: 'CIRC-RAJ',
    name: 'Rajkot R&B Circle',
    parentId: panchayatWing._id,
  });

  // Divisions
  const vadodaraDivision = await OrgUnit.create({
    type: 'DIVISION',
    code: 'DIV-VAD',
    name: 'Vadodara City & District R&B Division',
    parentId: vadodaraCircle._id,
    districtCode: 'VAD',
  });
  const ahmedabadDivision = await OrgUnit.create({
    type: 'DIVISION',
    code: 'DIV-AHM',
    name: 'Ahmedabad Capital R&B Division',
    parentId: ahmedabadCircle._id,
    districtCode: 'AHM',
  });
  const suratDivision = await OrgUnit.create({
    type: 'DIVISION',
    code: 'DIV-SUR',
    name: 'Surat Coastal Division',
    parentId: vadodaraCircle._id,
    districtCode: 'SUR',
  });
  const rajkotDivision = await OrgUnit.create({
    type: 'DIVISION',
    code: 'DIV-RAJ',
    name: 'Rajkot West Division',
    parentId: rajkotCircle._id,
    districtCode: 'RAJ',
  });
  const gandhinagarDivision = await OrgUnit.create({
    type: 'DIVISION',
    code: 'DIV-GNR',
    name: 'Gandhinagar Secretariat Division',
    parentId: ahmedabadCircle._id,
    districtCode: 'GNR',
  });
  const bhavnagarDivision = await OrgUnit.create({
    type: 'DIVISION',
    code: 'DIV-BHV',
    name: 'Bhavnagar Division',
    parentId: rajkotCircle._id,
    districtCode: 'BHV',
  });

  // Sub-divisions
  const padraSubdiv = await OrgUnit.create({
    type: 'SUBDIVISION',
    code: 'SUB-PADRA',
    name: 'Padra Sub-division',
    parentId: vadodaraDivision._id,
    districtCode: 'VAD',
    talukaCode: 'PADRA',
  });
  const vadodaraSubdiv = await OrgUnit.create({
    type: 'SUBDIVISION',
    code: 'SUB-VAD-CITY',
    name: 'Vadodara City Sub-division',
    parentId: vadodaraDivision._id,
    districtCode: 'VAD',
  });
  const daskroiSubdiv = await OrgUnit.create({
    type: 'SUBDIVISION',
    code: 'SUB-DASKROI',
    name: 'Daskroi Sub-division',
    parentId: ahmedabadDivision._id,
    districtCode: 'AHM',
  });
  const gnrSubdiv = await OrgUnit.create({
    type: 'SUBDIVISION',
    code: 'SUB-GNR-CAPITAL',
    name: 'Gandhinagar Capital Sub-division',
    parentId: gandhinagarDivision._id,
    districtCode: 'GNR',
  });

  console.log('✅ OrgUnits hierarchy seeded');

  // 2. Seed Users
  const hashedPassword = await bcrypt.hash('Password@123', 10);

  const stateUser = await User.create({
    email: 'state@demo.gov',
    password: hashedPassword,
    name: 'Er. Rajesh Patel (Chief Engineer HQ)',
    role: 'STATE_ADMIN',
    orgUnitId: stateWing._id,
    wingId: stateWing._id,
  });

  const circleUser = await User.create({
    email: 'circle@demo.gov',
    password: hashedPassword,
    name: 'Er. Suresh Joshi (Superintending Engineer)',
    role: 'CIRCLE_ADMIN',
    orgUnitId: vadodaraCircle._id,
    circleId: vadodaraCircle._id,
    wingId: stateWing._id,
  });

  const divisionUser = await User.create({
    email: 'division@demo.gov',
    password: hashedPassword,
    name: 'Er. Amit Shah (Executive Engineer)',
    role: 'DIVISION_ENGINEER',
    orgUnitId: vadodaraDivision._id,
    divisionId: vadodaraDivision._id,
    circleId: vadodaraCircle._id,
    wingId: stateWing._id,
  });

  const subdivUser = await User.create({
    email: 'subdivision@demo.gov',
    password: hashedPassword,
    name: 'Er. Nilesh Desai (Deputy Executive Engineer)',
    role: 'SUBDIVISION_ENGINEER',
    orgUnitId: padraSubdiv._id,
    subdivisionId: padraSubdiv._id,
    divisionId: vadodaraDivision._id,
    circleId: vadodaraCircle._id,
  });

  const fieldUser = await User.create({
    email: 'field@demo.gov',
    password: hashedPassword,
    name: 'Er. Bhavin Mehta (Junior Engineer)',
    role: 'FIELD_ENGINEER',
    orgUnitId: padraSubdiv._id,
    subdivisionId: padraSubdiv._id,
    divisionId: vadodaraDivision._id,
    circleId: vadodaraCircle._id,
  });

  const auditorUser = await User.create({
    email: 'auditor@demo.gov',
    password: hashedPassword,
    name: 'Shri K. L. Varma (Vigilance Auditor)',
    role: 'AUDITOR',
    orgUnitId: stateWing._id,
    wingId: stateWing._id,
  });

  console.log('✅ Users seeded');

  // 3. Seed Category Templates
  await Category.create([
    {
      classCode: 'RDS',
      name: 'Road Corridor',
      description: 'Corridor link parent',
      geometryType: 'LINE',
      designLifeYears: 30,
      renewalCycleYears: 7,
      inspectionSchedule: [
        { type: 'PRE_MONSOON', frequencyMonths: 12, windowStart: '04-01', windowEnd: '05-31' },
        { type: 'POST_MONSOON', frequencyMonths: 12, windowStart: '10-01', windowEnd: '11-30' },
      ],
      depreciable: false,
      fields: [{ key: 'routeCode', label: 'Route Code', type: 'text', required: true }],
    },
    {
      classCode: 'SEG',
      name: 'Road Segment',
      description: 'Homogeneous chainage stretch',
      geometryType: 'LINE',
      designLifeYears: 20,
      renewalCycleYears: 5,
      inspectionSchedule: [
        { type: 'PRE_MONSOON', frequencyMonths: 12 },
        { type: 'POST_MONSOON', frequencyMonths: 12 },
      ],
      depreciable: false,
      fields: [{ key: 'surfaceType', label: 'Surface Type', type: 'select', required: true, options: ['BT', 'CC', 'WBM'] }],
    },
    {
      classCode: 'BRG',
      name: 'Bridge / Structure',
      description: 'Bridges, Culverts, ROB/RUB',
      geometryType: 'POINT',
      designLifeYears: 60,
      renewalCycleYears: 15,
      inspectionSchedule: [
        { type: 'PRE_MONSOON', frequencyMonths: 12 },
        { type: 'POST_MONSOON', frequencyMonths: 12 },
        { type: 'DETAILED', frequencyMonths: 36 },
      ],
      depreciable: false,
      fields: [{ key: 'riverObstacle', label: 'Obstacle / River', type: 'text', required: true }],
    },
    {
      classCode: 'BLD',
      name: 'Public Building',
      description: 'Offices, Hospitals, Quarters',
      geometryType: 'POINT',
      designLifeYears: 50,
      renewalCycleYears: 10,
      inspectionSchedule: [{ type: 'SAFETY_AUDIT', frequencyMonths: 12 }],
      depreciable: true,
      fields: [{ key: 'occupantDepartment', label: 'Occupant Department', type: 'text', required: true }],
    },
    {
      classCode: 'LND',
      name: 'Land & Right of Way',
      description: 'Parcels & acquired corridors',
      geometryType: 'POLYGON',
      designLifeYears: 100,
      renewalCycleYears: 50,
      inspectionSchedule: [{ type: 'PHYSICAL_VERIFICATION', frequencyMonths: 24 }],
      depreciable: false,
      fields: [{ key: 'surveyNumber', label: 'Khasra / Survey No.', type: 'text', required: true }],
    },
    {
      classCode: 'MCH',
      name: 'Machinery & Equipment',
      description: 'Road rollers, pavers, lab apparatus',
      geometryType: 'POINT',
      designLifeYears: 15,
      renewalCycleYears: 5,
      inspectionSchedule: [{ type: 'PHYSICAL_VERIFICATION', frequencyMonths: 12 }],
      depreciable: true,
      fields: [{ key: 'serialNumber', label: 'Serial / Reg No.', type: 'text', required: true }],
    },
  ]);
  console.log('✅ Categories seeded');

  // Helper to create asset with valid hash event
  const createSeededAsset = async (assetData: any, initialStatus = 'IN_SERVICE') => {
    const asset = await Asset.create({
      ...assetData,
      status: initialStatus,
    });

    const now = new Date();
    const payload = {
      assetCode: asset.assetId,
      type: 'CREATED',
      toStatus: initialStatus,
      description: `Asset registered in official R&B registry (Demo seed data)`,
      userId: stateUser._id.toString(),
      userName: stateUser.name,
      createdAtTimestamp: now.getTime(),
      data: { initialStatus },
    };

    const hash = computeEventHash('GENESIS', payload);

    await AssetEvent.create({
      assetId: asset._id,
      assetCode: asset.assetId,
      type: 'CREATED',
      toStatus: initialStatus,
      description: payload.description,
      data: payload.data,
      userId: stateUser._id,
      userName: stateUser.name,
      prevHash: 'GENESIS',
      hash,
    });

    return asset;
  };

  // 4. Seed Roads & Segments
  const sh4Road = await createSeededAsset({
    assetId: 'GJ-RNB-RDS-VAD-000001',
    name: 'Ahmedabad - Vadodara State Highway (SH-4 Corridor)',
    classCode: 'RDS',
    subType: 'SH',
    districtCode: 'VAD',
    subdivisionId: padraSubdiv._id,
    divisionId: vadodaraDivision._id,
    circleId: vadodaraCircle._id,
    linear: { routeCode: 'SH-4', startChainageM: 0, endChainageM: 45000, lengthM: 45000 },
    geometry: {
      type: 'LineString',
      coordinates: [
        [72.5714, 23.0225],
        [72.8500, 22.7000],
        [73.1812, 22.3072],
      ],
    },
    acquisition: { cost: 450000000, year: 2012, sanctionNo: 'SH4/AA/2012' },
  });

  // Segment 1 (Good condition, DLP ending in 45 days)
  const in45Days = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
  const seg1 = await createSeededAsset(
    {
      assetId: 'GJ-RNB-SEG-VAD-000001',
      name: 'SH-4 · Km 0+000 to 12+500 (Vadodara Bypass Section)',
      classCode: 'SEG',
      subType: 'SH',
      parentAssetId: sh4Road._id,
      districtCode: 'VAD',
      subdivisionId: padraSubdiv._id,
      divisionId: vadodaraDivision._id,
      circleId: vadodaraCircle._id,
      linear: { routeCode: 'SH-4', startChainageM: 0, endChainageM: 12500, lengthM: 12500 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [73.1812, 22.3072],
          [73.1200, 22.3500],
        ],
      },
      conditionScore: 5,
      condition: 'VERY_GOOD',
      dlpEndDate: in45Days,
      priorityScore: 15,
      attributes: { carriagewayWidth: 10.5, surfaceType: 'BT', lanes: 4 },
      acquisition: { cost: 125000000, year: 2023 },
    },
    'DEFECT_LIABILITY'
  );

  // Segment 2 (Overdue renewal, Poor condition score 2)
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const seg2 = await createSeededAsset({
    assetId: 'GJ-RNB-SEG-VAD-000002',
    name: 'SH-4 · Km 12+500 to 28+000 (Padra Industrial Stretch)',
    classCode: 'SEG',
    subType: 'SH',
    parentAssetId: sh4Road._id,
    districtCode: 'VAD',
    subdivisionId: padraSubdiv._id,
    divisionId: vadodaraDivision._id,
    circleId: vadodaraCircle._id,
    linear: { routeCode: 'SH-4', startChainageM: 12500, endChainageM: 28000, lengthM: 15500 },
    geometry: {
      type: 'LineString',
      coordinates: [
        [73.1200, 22.3500],
        [73.0500, 22.4200],
      ],
    },
    conditionScore: 2,
    condition: 'POOR',
    lastRenewalDate: new Date('2016-04-10'),
    nextRenewalDue: sixMonthsAgo,
    priorityScore: 85, // High priority score
    attributes: { carriagewayWidth: 7.0, surfaceType: 'BT', lanes: 2 },
    acquisition: { cost: 95000000, year: 2016 },
  });

  // 5. Seed Bridges
  // Bridge 1: Severe Risk, RESTRICTED with load limit
  const brg1 = await createSeededAsset(
    {
      assetId: 'GJ-RNB-BRG-VAD-000001',
      name: 'Major Bridge across Vishwamitri River on SH-4 (Km 14+200)',
      classCode: 'BRG',
      subType: 'MAJOR_BRIDGE',
      districtCode: 'VAD',
      subdivisionId: padraSubdiv._id,
      divisionId: vadodaraDivision._id,
      circleId: vadodaraCircle._id,
      geometry: { type: 'Point', coordinates: [73.1600, 22.3100] },
      conditionScore: 2,
      condition: 'POOR',
      operationalStatus: 'RESTRICTED',
      riskScore: 82, // SEVERE RISK WATCHLIST
      attributes: {
        riverObstacle: 'Vishwamitri River',
        loadRestriction: 16, // 16 tonnes limit
        isScourProne: true,
        numberOfSpans: 6,
        totalLength: 180,
      },
      externalRefs: { ibmsBridgeId: 'IBMS-GJ-VAD-0012' },
      acquisition: { cost: 42000000, year: 1982 },
      lastInspectionAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // Overdue inspection
      nextInspectionDue: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    },
    'RESTRICTED'
  );

  // Bridge 2: Emergency CLOSED awaiting ratification
  const brg2 = await createSeededAsset(
    {
      assetId: 'GJ-RNB-BRG-VAD-000002',
      name: 'Dhadhar River Minor Bridge (Near Padra Taluka Border)',
      classCode: 'BRG',
      subType: 'MINOR_BRIDGE',
      districtCode: 'VAD',
      subdivisionId: padraSubdiv._id,
      divisionId: vadodaraDivision._id,
      circleId: vadodaraCircle._id,
      geometry: { type: 'Point', coordinates: [73.0800, 22.2500] },
      conditionScore: 1,
      condition: 'CRITICAL',
      operationalStatus: 'CLOSED',
      riskScore: 94,
      attributes: {
        riverObstacle: 'Dhadhar River',
        isScourProne: true,
      },
      acquisition: { cost: 18000000, year: 1978 },
    },
    'CLOSED'
  );

  // 6. Seed Buildings
  // Building 1: UNSAFE building
  const bld1 = await createSeededAsset(
    {
      assetId: 'GJ-RNB-BLD-VAD-000001',
      name: 'Old Taluka Panchayat Office Building (East Wing)',
      classCode: 'BLD',
      subType: 'OFFICE',
      occupantDepartment: 'Panchayat Rural Development',
      ownerDepartment: 'R&B Department',
      maintenanceResponsibility: 'RNB',
      districtCode: 'VAD',
      subdivisionId: padraSubdiv._id,
      divisionId: vadodaraDivision._id,
      circleId: vadodaraCircle._id,
      geometry: { type: 'Point', coordinates: [73.1900, 22.3200] },
      conditionScore: 1,
      condition: 'CRITICAL',
      attributes: {
        plinthArea: 2200,
        floors: 3,
        fireNocExpiry: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // Expiring in 20 days
      },
      acquisition: { cost: 12000000, year: 1974 },
    },
    'UNSAFE'
  );

  // Building 2: Vadodara Civil Hospital Ward Block
  const bld2 = await createSeededAsset({
    assetId: 'GJ-RNB-BLD-VAD-000002',
    name: 'Vadodara SSG Hospital Emergency & Trauma Block',
    classCode: 'BLD',
    subType: 'HOSPITAL',
    occupantDepartment: 'Health & Family Welfare Department',
    ownerDepartment: 'R&B Department',
    maintenanceResponsibility: 'RNB',
    districtCode: 'VAD',
    subdivisionId: vadodaraSubdiv._id,
    divisionId: vadodaraDivision._id,
    circleId: vadodaraCircle._id,
    geometry: { type: 'Point', coordinates: [73.2000, 22.3000] },
    conditionScore: 4,
    condition: 'GOOD',
    attributes: { plinthArea: 18500, floors: 7 },
    acquisition: { cost: 180000000, year: 2018 },
  });

  // 7. Seed Inspections & Drives
  const drive = await InspectionDrive.create({
    name: 'Post-Monsoon 2026 Structural Safety Drive (Vadodara Circle)',
    type: 'POST_MONSOON',
    year: 2026,
    windowStart: new Date('2026-10-01'),
    windowEnd: new Date('2026-11-30'),
    divisionId: vadodaraDivision._id,
    circleId: vadodaraCircle._id,
    status: 'ACTIVE',
    createdBy: stateUser._id,
  });

  await Inspection.create({
    assetId: brg1._id,
    assetCode: brg1.assetId,
    type: 'POST_MONSOON',
    inspectorId: fieldUser._id,
    inspectorName: fieldUser.name,
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    conditionScore: 2,
    defects: [
      {
        type: 'Severe Spalling & Exposed Rebar at Pier 2',
        severity: 'CRITICAL',
        note: 'Concrete cover delaminated, reinforcement corroded by flood waters',
        contractorLiable: false,
      },
      {
        type: 'Expansion Joint Failure',
        severity: 'HIGH',
        note: 'Seals torn, water seepage affecting bearing seat',
        contractorLiable: false,
      },
    ],
    recommendedAction: 'SPECIAL_REPAIR',
    estimatedCost: 3500000,
    remarks: 'Immediate load restriction recommended. Bearing replacement required.',
    driveId: drive._id,
    subdivisionId: padraSubdiv._id,
    divisionId: vadodaraDivision._id,
    circleId: vadodaraCircle._id,
  });

  // 8. Seed Works
  await Work.create({
    assetId: seg1._id,
    assetCode: seg1.assetId,
    type: 'PERIODIC_RENEWAL',
    aaNo: 'RNB/AA/2023/VAD/092',
    tsNo: 'TS/2023/VAD/045',
    contractor: 'Gujarat Infra Projects Pvt Ltd',
    estimatedCost: 28000000,
    actualCost: 27400000,
    startDate: new Date('2023-01-15'),
    actualCompletion: new Date('2023-11-10'),
    dlpMonths: 36,
    dlpEndDate: in45Days,
    status: 'COMPLETED',
    progressPercent: 100,
    description: '40mm Bituminous Concrete overlay and shoulder strengthening',
    subdivisionId: padraSubdiv._id,
    divisionId: vadodaraDivision._id,
    circleId: vadodaraCircle._id,
    createdBy: divisionUser._id,
  });

  // 9. Seed Approval Request
  await ApprovalRequest.create({
    assetId: bld1._id,
    assetCode: bld1.assetId,
    type: 'TRANSITION_CONDEMNATION_PENDING',
    requestedTransition: { from: 'UNSAFE', to: 'CONDEMNATION_PENDING' },
    reason: 'Building declared structurally unsafe post-audit. Condemnation committee report enclosed.',
    estimatedValue: 12000000,
    requesterId: subdivUser._id,
    requesterName: subdivUser.name,
    requiredLevel: 'CIRCLE_ADMIN',
    status: 'PENDING',
  });

  // 10. Seed Citizen Report
  await CitizenReport.create({
    assetId: seg2._id,
    assetCode: seg2.assetId,
    description: 'Large pothole cluster causing vehicle skidding near Padra GIDC junction.',
    reporterName: 'Ketan Patel',
    reporterPhone: '9876543210',
    status: 'NEW',
    subdivisionId: padraSubdiv._id,
    divisionId: vadodaraDivision._id,
  });

  // 11. Initial Counter Keys
  await Counter.create([
    { key: 'RDS-VAD', seq: 1 },
    { key: 'SEG-VAD', seq: 2 },
    { key: 'BRG-VAD', seq: 2 },
    { key: 'BLD-VAD', seq: 2 },
  ]);

  console.log('🎉 Seed script executed successfully with all demo models, watchlists, and hash-chained events!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed Error:', err);
  process.exit(1);
});
