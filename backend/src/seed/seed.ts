/**
 * CivicPulse Database Seed Script
 * 
 * Creates: 4 wards, 6 departments, routing rules, users (admin, staff, citizens),
 * 20 sample reports with realistic status histories, and default system config.
 * 
 * Run: npm run seed
 */
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/civicpulse';

// ── Ward Boundary Data (Ahmedabad-inspired rectangular zones) ────────
const WARDS = [
  {
    name: 'Ward 1 - Navrangpura',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [72.540, 23.040],
        [72.560, 23.040],
        [72.560, 23.060],
        [72.540, 23.060],
        [72.540, 23.040],
      ]],
    },
  },
  {
    name: 'Ward 2 - Maninagar',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [72.560, 23.040],
        [72.580, 23.040],
        [72.580, 23.060],
        [72.560, 23.060],
        [72.560, 23.040],
      ]],
    },
  },
  {
    name: 'Ward 3 - Satellite',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [72.540, 23.020],
        [72.560, 23.020],
        [72.560, 23.040],
        [72.540, 23.040],
        [72.540, 23.020],
      ]],
    },
  },
  {
    name: 'Ward 4 - Bopal',
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [72.560, 23.020],
        [72.580, 23.020],
        [72.580, 23.040],
        [72.560, 23.040],
        [72.560, 23.020],
      ]],
    },
  },
];

// ── Categories & Departments ─────────────────────────────────────────
const DEPARTMENTS = [
  { name: 'Sanitation Department', category_scope: ['garbage'] },
  { name: 'Public Works Department', category_scope: ['pothole', 'drainage'] },
  { name: 'Electrical Department', category_scope: ['streetlight'] },
  { name: 'Water Supply Department', category_scope: ['water_leakage'] },
  { name: 'Animal Control', category_scope: ['stray_animal'] },
  { name: 'General Services', category_scope: ['other'] },
];

// Map categories to department names for routing rules
const CATEGORY_DEPT_MAP: Record<string, string> = {
  garbage: 'Sanitation Department',
  pothole: 'Public Works Department',
  drainage: 'Public Works Department',
  streetlight: 'Electrical Department',
  water_leakage: 'Water Supply Department',
  stray_animal: 'Animal Control',
  other: 'General Services',
};

// ── Sample Report Data ──────────────────────────────────────────────
const SAMPLE_REPORTS = [
  { category: 'pothole', description: 'Large pothole near the main intersection, very dangerous for two-wheelers', ward: 0, status: 'verified', daysAgo: 25 },
  { category: 'pothole', description: 'Deep pothole on the service road causing accidents', ward: 1, status: 'resolved', daysAgo: 20 },
  { category: 'garbage', description: 'Overflowing garbage bin near the school gate', ward: 0, status: 'in_progress', daysAgo: 5 },
  { category: 'garbage', description: 'Waste dump on the roadside for over a week', ward: 2, status: 'acknowledged', daysAgo: 3 },
  { category: 'streetlight', description: 'Streetlight flickering and going off at night, unsafe area', ward: 1, status: 'resolved', daysAgo: 15 },
  { category: 'streetlight', description: 'Three streetlights not working on the main road', ward: 3, status: 'in_progress', daysAgo: 7 },
  { category: 'water_leakage', description: 'Major water pipe burst flooding the entire street', ward: 0, status: 'resolved', daysAgo: 10 },
  { category: 'water_leakage', description: 'Continuous water leakage from underground pipe', ward: 2, status: 'acknowledged', daysAgo: 2 },
  { category: 'drainage', description: 'Blocked drainage causing waterlogging during rain', ward: 1, status: 'in_progress', daysAgo: 8 },
  { category: 'drainage', description: 'Open manhole cover missing, very hazardous', ward: 3, status: 'acknowledged', daysAgo: 1 },
  { category: 'stray_animal', description: 'Pack of stray dogs near the park, aggressive behavior', ward: 0, status: 'acknowledged', daysAgo: 4 },
  { category: 'stray_animal', description: 'Injured stray cow blocking traffic', ward: 2, status: 'resolved', daysAgo: 12 },
  { category: 'other', description: 'Broken bench in the public garden', ward: 1, status: 'verified', daysAgo: 18 },
  { category: 'pothole', description: 'Series of potholes on the highway exit ramp', ward: 3, status: 'submitted', daysAgo: 1 },
  { category: 'garbage', description: 'Construction debris dumped on the footpath', ward: 1, status: 'submitted', daysAgo: 0 },
  { category: 'streetlight', description: 'Broken streetlight pole leaning dangerously', ward: 0, status: 'acknowledged', daysAgo: 6 },
  { category: 'water_leakage', description: 'Emergency: water main break, road flooding rapidly', ward: 3, status: 'in_progress', daysAgo: 3 },
  { category: 'pothole', description: 'Pothole filled with water, hidden danger for vehicles', ward: 2, status: 'in_progress', daysAgo: 9 },
  { category: 'garbage', description: 'Medical waste found near residential area, urgent cleanup needed', ward: 3, status: 'acknowledged', daysAgo: 2 },
  { category: 'drainage', description: 'Severe waterlogging blocking the entire colony entrance', ward: 0, status: 'submitted', daysAgo: 0 },
];

// ── Helpers ──────────────────────────────────────────────────────────
function randomCoordInWard(wardIndex: number): [number, number] {
  const ward = WARDS[wardIndex];
  const coords = ward.boundary.coordinates[0];
  const minLng = coords[0][0];
  const maxLng = coords[1][0];
  const minLat = coords[0][1];
  const maxLat = coords[2][1];
  const lng = minLng + Math.random() * (maxLng - minLng);
  const lat = minLat + Math.random() * (maxLat - minLat);
  return [parseFloat(lng.toFixed(6)), parseFloat(lat.toFixed(6))];
}

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 12) + 8);
  return d;
}

function hoursLater(date: Date, minH: number, maxH: number): Date {
  const d = new Date(date);
  d.setTime(d.getTime() + (minH + Math.random() * (maxH - minH)) * 60 * 60 * 1000);
  return d;
}

// ── Main Seed Function ──────────────────────────────────────────────
async function seed() {
  console.log(`\n🌱 Seeding CivicPulse database at ${MONGO_URI}\n`);

  await mongoose.connect(MONGO_URI);

  // Clear existing data
  const collections = ['users', 'departments', 'wards', 'routing_rules', 'reports', 'system_config', 'refresh_tokens'];
  for (const col of collections) {
    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.dropCollection(col);
      }
    } catch { /* ok if doesn't exist */ }
  }
  console.log('✓ Cleared existing collections');

  // ── 1. Create Wards ─────────────────────────────────────────────
  const WardModel = mongoose.model('Ward', new mongoose.Schema({
    name: String,
    boundary: { type: { type: String }, coordinates: [[[Number]]] },
  }, { timestamps: true, collection: 'wards' }));

  const wardDocs = await WardModel.insertMany(WARDS);
  console.log(`✓ Created ${wardDocs.length} wards`);

  // Create 2dsphere index
  await WardModel.collection.createIndex({ boundary: '2dsphere' });

  // ── 2. Create Departments ───────────────────────────────────────
  const DeptModel = mongoose.model('Department', new mongoose.Schema({
    name: { type: String, unique: true },
    category_scope: [String],
    head_user_id: mongoose.Schema.Types.ObjectId,
  }, { timestamps: true, collection: 'departments' }));

  const deptDocs = await DeptModel.insertMany(DEPARTMENTS);
  const deptMap = new Map(deptDocs.map(d => [d.name, d]));
  console.log(`✓ Created ${deptDocs.length} departments`);

  // ── 3. Create Users ─────────────────────────────────────────────
  const UserModel = mongoose.model('User', new mongoose.Schema({
    name: String, phone: String, email: String, passwordHash: String,
    role: String, department_id: mongoose.Schema.Types.ObjectId,
    ward_scope: [mongoose.Schema.Types.ObjectId],
    fcm_token: String, civic_score: { type: Number, default: 0 },
    otp_hash: String, otp_expires_at: Date,
  }, { timestamps: true, collection: 'users' }));

  const passwordHash = await bcrypt.hash('Admin@123', 10);

  // Super Admin
  const superAdmin = await UserModel.create({
    name: 'Super Admin', email: 'admin@civicpulse.in',
    passwordHash, role: 'super-admin',
  });
  console.log(`✓ Super Admin: admin@civicpulse.in / Admin@123`);

  // Department Heads
  const deptHeads: any[] = [];
  const deptHeadData = [
    { name: 'Priya Sharma', email: 'priya@civicpulse.in', dept: 'Sanitation Department' },
    { name: 'Amit Patel', email: 'amit@civicpulse.in', dept: 'Public Works Department' },
  ];
  for (const dh of deptHeadData) {
    const dept = deptMap.get(dh.dept);
    const user = await UserModel.create({
      name: dh.name, email: dh.email, passwordHash,
      role: 'dept-head', department_id: dept!._id,
    });
    // Update department head
    await DeptModel.findByIdAndUpdate(dept!._id, { head_user_id: user._id });
    deptHeads.push(user);
  }
  console.log(`✓ Created ${deptHeads.length} department heads`);

  // Staff
  const staffData = [
    { name: 'Ravi Kumar', email: 'ravi@civicpulse.in', dept: 'Sanitation Department' },
    { name: 'Sunita Devi', email: 'sunita@civicpulse.in', dept: 'Public Works Department' },
    { name: 'Kiran Shah', email: 'kiran@civicpulse.in', dept: 'Electrical Department' },
  ];
  const staffUsers: any[] = [];
  for (const s of staffData) {
    const dept = deptMap.get(s.dept);
    const user = await UserModel.create({
      name: s.name, email: s.email, passwordHash,
      role: 'staff', department_id: dept!._id,
    });
    staffUsers.push(user);
  }
  console.log(`✓ Created ${staffUsers.length} staff users`);

  // Citizens
  const citizenData = [
    { name: 'Aarav Mehta', phone: '+919876543210' },
    { name: 'Diya Joshi', phone: '+919876543211' },
    { name: 'Rohan Gupta', phone: '+919876543212' },
    { name: 'Neha Singh', phone: '+919876543213' },
    { name: 'Vikram Reddy', phone: '+919876543214' },
  ];
  const citizenUsers: any[] = [];
  for (const c of citizenData) {
    const user = await UserModel.create({ ...c, role: 'citizen', civic_score: Math.floor(Math.random() * 50) });
    citizenUsers.push(user);
  }
  console.log(`✓ Created ${citizenUsers.length} citizens`);

  // ── 4. Create Routing Rules ─────────────────────────────────────
  const RuleModel = mongoose.model('RoutingRule', new mongoose.Schema({
    category: String,
    ward_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    department_id: mongoose.Schema.Types.ObjectId,
  }, { timestamps: true, collection: 'routing_rules' }));

  const rules: any[] = [];
  for (const [category, deptName] of Object.entries(CATEGORY_DEPT_MAP)) {
    const dept = deptMap.get(deptName);
    // Create catch-all rule (no ward)
    rules.push({ category, ward_id: null, department_id: dept!._id });
    // Create per-ward rules
    for (const ward of wardDocs) {
      rules.push({ category, ward_id: ward._id, department_id: dept!._id });
    }
  }
  await RuleModel.insertMany(rules);
  console.log(`✓ Created ${rules.length} routing rules`);

  // ── 5. Create System Config ─────────────────────────────────────
  const ConfigModel = mongoose.model('SystemConfig', new mongoose.Schema({
    categories: [String],
    priority_weights: { w1: Number, w2: Number, w3: Number, w4: Number },
    category_base_weights: Object,
    sla_target_hours: Number,
  }, { timestamps: true, collection: 'system_config' }));

  await ConfigModel.create({
    categories: ['pothole', 'streetlight', 'garbage', 'water_leakage', 'drainage', 'stray_animal', 'other'],
    priority_weights: { w1: 3, w2: 2, w3: 5, w4: 1 },
    category_base_weights: {
      pothole: 6, streetlight: 5, garbage: 4,
      water_leakage: 8, drainage: 7, stray_animal: 3, other: 2,
    },
    sla_target_hours: 24,
  });
  console.log('✓ Created system config');

  // ── 6. Create Sample Reports ────────────────────────────────────
  const ReportModel = mongoose.model('Report', new mongoose.Schema({
    reporter_id: mongoose.Schema.Types.ObjectId,
    category: String, description: String, voice_note_url: String,
    images: [String],
    location: { type: { type: String }, coordinates: [Number] },
    address: String, ward_id: mongoose.Schema.Types.ObjectId,
    status: String, priority_tier: String, priority_score: Number,
    assigned_department_id: mongoose.Schema.Types.ObjectId,
    assigned_staff_id: mongoose.Schema.Types.ObjectId,
    upvote_count: { type: Number, default: 0 },
    upvoted_by: [mongoose.Schema.Types.ObjectId],
    duplicate_of_report_id: mongoose.Schema.Types.ObjectId,
    status_history: [{
      status: String, note: String,
      actor_id: mongoose.Schema.Types.ObjectId,
      timestamp: Date, photo_url: String,
    }],
    resolved_at: Date,
  }, { timestamps: true, collection: 'reports' }));

  for (const sr of SAMPLE_REPORTS) {
    const citizen = citizenUsers[Math.floor(Math.random() * citizenUsers.length)];
    const [lng, lat] = randomCoordInWard(sr.ward);
    const dept = deptMap.get(CATEGORY_DEPT_MAP[sr.category]);
    const ward = wardDocs[sr.ward];
    const createdAt = daysAgoDate(sr.daysAgo);

    // Build status history based on target status
    const statusHistory: any[] = [];
    const addHistory = (status: string, note: string, hoursMin: number, hoursMax: number, prevDate: Date, actor: any, photoUrl?: string) => {
      const ts = hoursLater(prevDate, hoursMin, hoursMax);
      statusHistory.push({ status, note, actor_id: actor._id, timestamp: ts, photo_url: photoUrl });
      return ts;
    };

    let lastDate = createdAt;
    const allStatuses = ['submitted', 'acknowledged', 'in_progress', 'resolved', 'verified'];
    const targetIdx = allStatuses.indexOf(sr.status);

    // Always add submitted
    statusHistory.push({
      status: 'submitted', note: 'Report submitted by citizen',
      actor_id: citizen._id, timestamp: createdAt,
    });

    if (targetIdx >= 1) {
      lastDate = addHistory('acknowledged', 'Auto-acknowledged by routing engine', 0.1, 2, lastDate, superAdmin);
    }
    if (targetIdx >= 2) {
      const staff = staffUsers[Math.floor(Math.random() * staffUsers.length)];
      lastDate = addHistory('in_progress', 'Team dispatched to site', 1, 12, lastDate, staff);
    }
    if (targetIdx >= 3) {
      const staff = staffUsers[Math.floor(Math.random() * staffUsers.length)];
      lastDate = addHistory('resolved', 'Issue has been fixed on site', 2, 48, lastDate, staff, 'https://civicpulse-uploads.s3.ap-south-1.amazonaws.com/after-photos/resolved-sample.jpg');
    }
    if (targetIdx >= 4) {
      lastDate = addHistory('verified', 'Citizen confirmed resolution', 1, 24, lastDate, citizen);
    }

    // Priority scoring (simplified for seed)
    const urgencyWords = ['dangerous', 'emergency', 'hazardous', 'flooding', 'urgent'];
    const descLower = (sr.description || '').toLowerCase();
    let urgencyScore = 0;
    for (const w of urgencyWords) {
      if (descLower.includes(w)) { urgencyScore = Math.max(urgencyScore, 8); }
    }
    const catWeights: Record<string, number> = { pothole: 6, streetlight: 5, garbage: 4, water_leakage: 8, drainage: 7, stray_animal: 3, other: 2 };
    const upvotes = Math.floor(Math.random() * 15);
    const score = 3 * Math.floor(Math.random() * 5) + 2 * upvotes + 5 * urgencyScore + 1 * (catWeights[sr.category] || 2);
    const tier = score >= 40 ? 'critical' : score >= 25 ? 'high' : score >= 12 ? 'medium' : 'low';

    await ReportModel.create({
      reporter_id: citizen._id,
      category: sr.category,
      description: sr.description,
      images: [`https://civicpulse-uploads.s3.ap-south-1.amazonaws.com/reports/sample-${sr.category}-${Math.floor(Math.random() * 100)}.jpg`],
      location: { type: 'Point', coordinates: [lng, lat] },
      address: `${ward.name}, Ahmedabad`,
      ward_id: ward._id,
      status: sr.status,
      priority_tier: tier,
      priority_score: score,
      assigned_department_id: dept!._id,
      upvote_count: upvotes,
      status_history: statusHistory,
      resolved_at: targetIdx >= 3 ? statusHistory.find((h: any) => h.status === 'resolved')?.timestamp : undefined,
      createdAt,
      updatedAt: lastDate,
    });
  }

  // Create 2dsphere index on reports
  await ReportModel.collection.createIndex({ location: '2dsphere' });
  await ReportModel.collection.createIndex({ category: 1, status: 1, createdAt: -1 });

  console.log(`✓ Created ${SAMPLE_REPORTS.length} sample reports`);

  console.log('\n✅ Seed completed successfully!\n');
  console.log('Login credentials (all passwords: Admin@123):');
  console.log('  Super Admin : admin@civicpulse.in');
  console.log('  Dept Head   : priya@civicpulse.in (Sanitation)');
  console.log('  Dept Head   : amit@civicpulse.in (PWD)');
  console.log('  Staff       : ravi@civicpulse.in, sunita@civicpulse.in, kiran@civicpulse.in');
  console.log('  Citizens    : Use OTP flow with phones +919876543210 to +919876543214\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
