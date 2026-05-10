import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const dotenv = require("dotenv");
dotenv.config({ path: join(__dirname, "../.env.local") });
dotenv.config({ path: join(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const q = (text, params) => pool.query(text, params);

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}
function nextDueFromJoin(joinDate, cycle) {
  const d = new Date(joinDate);
  if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cycle === "weekly") d.setDate(d.getDate() + 7);
  else d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ── DATA ────────────────────────────────────────────────────────────────────

const OWNERS = [
  { name: "Arjun Sharma",   email: "arjun@demo.com",   phone: "9000000001", password: "Demo@1234" },
  { name: "Priya Mehta",    email: "priya@demo.com",    phone: "9000000002", password: "Demo@1234" },
  { name: "Ramesh Yadav",   email: "ramesh@demo.com",   phone: "9000000003", password: "Demo@1234" },
  { name: "Sunita Reddy",   email: "sunita@demo.com",   phone: "9000000004", password: "Demo@1234" },
  { name: "Vikram Nair",    email: "vikram@demo.com",   phone: "9000000005", password: "Demo@1234" },
];

// 10 hostels, distributed: arjun=3, priya=3, ramesh=2, sunita=1, vikram=1
const HOSTEL_DEFS = [
  { ownerIdx: 0, name: "Sunrise PG",           address: "12 MG Road, Bangalore" },
  { ownerIdx: 0, name: "Blue Ridge Residency",  address: "34 Koramangala, Bangalore" },
  { ownerIdx: 0, name: "Arjun Boys Hostel",     address: "78 Indiranagar, Bangalore" },
  { ownerIdx: 1, name: "Green Valley PG",       address: "45 Anna Nagar, Chennai" },
  { ownerIdx: 1, name: "Priya Ladies Hostel",   address: "22 T Nagar, Chennai" },
  { ownerIdx: 1, name: "Pearl View PG",         address: "10 Adyar, Chennai" },
  { ownerIdx: 2, name: "Ramesh PG Home",        address: "5 Banjara Hills, Hyderabad" },
  { ownerIdx: 2, name: "City Comfort Hostel",   address: "88 Jubilee Hills, Hyderabad" },
  { ownerIdx: 3, name: "Sunita Ladies PG",      address: "33 Aundh, Pune" },
  { ownerIdx: 4, name: "Vikram Executive PG",   address: "17 Karol Bagh, Delhi" },
];

const FIRST_NAMES = ["Rahul","Sneha","Amit","Divya","Karan","Pooja","Ravi","Anita","Suresh","Meena",
  "Ajay","Kavita","Nitin","Rekha","Vijay","Sonal","Deepak","Nisha","Manoj","Prachi",
  "Sanjay","Geeta","Rohit","Swati","Arun","Shweta","Harish","Neha","Pankaj","Sunita",
  "Lokesh","Pallavi","Gaurav","Shruti","Dinesh","Ankita","Sunil","Ritu","Naveen","Smita",
  "Vishal","Tanvi","Ashok","Preeti","Mohan","Jyoti","Prakash","Komal","Rajesh","Mansi"];

const LAST_NAMES = ["Verma","Patel","Kumar","Nair","Singh","Sharma","Reddy","Yadav","Mehta","Joshi",
  "Gupta","Iyer","Pillai","Desai","Shah","Chopra","Bose","Roy","Das","Chatterjee"];

const CYCLES = ["monthly","monthly","monthly","weekly","daily"]; // weighted toward monthly

function makeName(idx) {
  return `${FIRST_NAMES[idx % FIRST_NAMES.length]} ${pick(LAST_NAMES)}`;
}

function makeRooms(hostelId, floorId, count) {
  const rooms = [];
  for (let i = 1; i <= count; i++) {
    const bedCount = rand(1, 4);
    const roomNumber = String(100 + i);
    const unitId = `${hostelId}-${floorId}-room-${roomNumber}`;
    rooms.push({
      id: unitId,
      unitId,
      roomNumber,
      bedCount,
      sharingType: bedCount === 1 ? "Single sharing" : `${bedCount} sharing`,
      beds: Array.from({ length: bedCount }, (_, b) => ({
        id: `${unitId}-bed-${b + 1}`,
        label: `Bed ${b + 1}`,
      })),
    });
  }
  return rooms;
}

async function seed() {
  console.log("Connecting...");
  await q("SELECT 1");
  console.log("Connected.\n");

  // ── OWNERS ────────────────────────────────────────────────────────────────
  const ownerRows = [];
  for (const o of OWNERS) {
    const hash = await bcrypt.hash(o.password, 12);
    const ex = await q("SELECT id FROM owners WHERE email=$1", [o.email]);
    let id;
    if (ex.rowCount > 0) {
      id = ex.rows[0].id;
      console.log(`Owner exists: ${o.email}`);
    } else {
      const r = await q(
        `INSERT INTO owners (email,password,name,phone_number,status,plan,plan_status,trial_start_date)
         VALUES ($1,$2,$3,$4,'active','free','trial',NOW()) RETURNING id`,
        [o.email, hash, o.name, o.phone]
      );
      id = r.rows[0].id;
      console.log(`Created owner: ${o.email} (id=${id})`);
    }
    ownerRows.push({ ...o, id });
  }

  // ── HOSTELS ───────────────────────────────────────────────────────────────
  const hostelRows = [];
  for (const h of HOSTEL_DEFS) {
    const owner = ownerRows[h.ownerIdx];
    const roomCount = rand(2, 5);
    const floorId = "floor-1";
    // Use temp id for room building, replace after insert
    const tempRooms = makeRooms("TMP", floorId, roomCount);
    const floors = [{ id: floorId, floorLabel: "Floor 1", rooms: tempRooms }];

    const ex = await q("SELECT id FROM hostels WHERE owner_id=$1 AND name=$2", [owner.id, h.name]);
    let hostelId;
    if (ex.rowCount > 0) {
      hostelId = ex.rows[0].id;
      console.log(`Hostel exists: ${h.name}`);
    } else {
      const r = await q(
        `INSERT INTO hostels (owner_id,name,address,type,data) VALUES ($1,$2,$3,'PG',$4) RETURNING id`,
        [owner.id, h.name, h.address, JSON.stringify({ floors })]
      );
      hostelId = r.rows[0].id;
      // Rebuild rooms with real hostelId
      const realRooms = makeRooms(hostelId, floorId, roomCount);
      const realFloors = [{ id: floorId, floorLabel: "Floor 1", rooms: realRooms }];
      await q("UPDATE hostels SET data=$1 WHERE id=$2", [JSON.stringify({ floors: realFloors }), hostelId]);
      console.log(`Created hostel: ${h.name} (id=${hostelId}, rooms=${roomCount})`);
    }

    // Reload actual rooms from DB
    const dbHostel = await q("SELECT data FROM hostels WHERE id=$1", [hostelId]);
    const dbFloors = dbHostel.rows[0].data.floors;
    hostelRows.push({ ...h, id: hostelId, ownerId: owner.id, floors: dbFloors });
  }

  // ── COLLECT ALL BEDS ──────────────────────────────────────────────────────
  const allBeds = [];
  for (const hostel of hostelRows) {
    for (const floor of hostel.floors) {
      for (const room of floor.rooms) {
        for (const bed of (room.beds || [])) {
          allBeds.push({
            hostelId: hostel.id,
            ownerId: hostel.ownerId,
            unitId: room.unitId || room.id,
            bedId: bed.id,
            bedLabel: bed.label,
          });
        }
      }
    }
  }

  // Shuffle beds and pick 50 (or all if fewer)
  const shuffled = allBeds.sort(() => Math.random() - 0.5);
  const targetBeds = shuffled.slice(0, Math.min(50, shuffled.length));

  console.log(`\nTotal beds available: ${allBeds.length}, seeding ${targetBeds.length} tenants\n`);

  // ── TENANTS ───────────────────────────────────────────────────────────────
  let tenantCount = 0;
  for (let i = 0; i < targetBeds.length; i++) {
    const bed = targetBeds[i];
    const fullName = makeName(i);
    const phone = `80${String(100000000 + i).slice(1)}`;
    const cycle = pick(CYCLES);
    const daysAgo = rand(5, 180);
    const joinDate = dateOffset(daysAgo);
    const nextDue = nextDueFromJoin(joinDate, cycle);
    const rent = pick([4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000]);

    const ex = await q(
      "SELECT id FROM tenants WHERE owner_id=$1 AND data->>'phone'=$2",
      [bed.ownerId, phone]
    );
    if (ex.rowCount > 0) { console.log(`Tenant phone exists: ${phone}`); continue; }

    const data = {
      fullName,
      phone,
      monthlyRent: rent,
      rentPaid: rent,
      paidOnDate: joinDate,
      billingCycle: cycle,
      billingAnchorDate: joinDate,
      nextDueDate: nextDue,
      paymentHistory: [{ date: joinDate, amount: rent, note: "Move-in" }],
      assignment: {
        hostelId: String(bed.hostelId),
        unitId: bed.unitId,
        bedId: bed.bedId,
        bedLabel: bed.bedLabel,
      },
    };

    const tr = await q(
      `INSERT INTO tenants (owner_id,hostel_id,data) VALUES ($1,$2,$3) RETURNING id`,
      [bed.ownerId, bed.hostelId, JSON.stringify(data)]
    );
    const tenantId = tr.rows[0].id;

    await q(
      `INSERT INTO allocations (tenant_id,owner_id,hostel_id,unit_id,bed_id,status,start_date)
       VALUES ($1,$2,$3,$4,$5,'ACTIVE',$6) ON CONFLICT DO NOTHING`,
      [tenantId, bed.ownerId, bed.hostelId, bed.unitId, bed.bedId, joinDate]
    );

    tenantCount++;
    console.log(`  ${tenantCount}. ${fullName} | ${cycle} | ₹${rent} | joined ${joinDate}`);
  }

  console.log(`\n${"━".repeat(50)}`);
  console.log("SEED COMPLETE — OWNER LOGINS:");
  console.log("━".repeat(50));
  for (const o of ownerRows) {
    console.log(`  ${o.name}`);
    console.log(`  Email:    ${o.email}`);
    console.log(`  Password: ${o.password}`);
    console.log(`  ${"─".repeat(46)}`);
  }

  await pool.end();
}

seed().catch((err) => { console.error("Seed failed:", err.message); process.exit(1); });
