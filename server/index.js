const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load .env only in non-production (Azure supplies env vars natively)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
}

const app = express();

// Secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false // disabled so the React SPA loads fine
}));

// CORS — tighten origin in production via env var
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server (no origin) and the configured origin
    if (!origin || origin === ALLOWED_ORIGIN) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Global rate limiter — 200 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

// Stricter limiter for the leave-request notification endpoint
const leaveRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many leave requests, please slow down.' }
});

app.use(bodyParser.json());

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Use persistent storage on Azure (/home is preserved across deployments)
// Falls back to local path for development
const IS_AZURE = process.env.NODE_ENV === 'production' || process.env.WEBSITE_SITE_NAME !== undefined;
const DATA_FILE = IS_AZURE
  ? '/home/data/data.json'
  : path.join(__dirname, 'data.json');

// Ensure directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Power Automate webhook URL — must be set as an env var.
// Local dev: add to server/.env  (gitignored)
// Azure:     set in App Service > Configuration > Application Settings
const POWER_AUTOMATE_WEBHOOK = process.env.POWER_AUTOMATE_WEBHOOK || '';
const POWER_AUTOMATE_API_KEY = process.env.POWER_AUTOMATE_API_KEY || '';
if (!POWER_AUTOMATE_WEBHOOK) {
  console.warn('[WARN] POWER_AUTOMATE_WEBHOOK is not set — Teams notifications will be skipped.');
}
if (!POWER_AUTOMATE_API_KEY) {
  console.warn('[WARN] POWER_AUTOMATE_API_KEY is not set — Teams notifications will be skipped.');
}

const CATEGORY_NAMES = {
  SL: 'Sick Leave', PL: 'Planned Leave', CGL: 'Caregiver Leave',
  PH: 'Public Holiday', TFL: 'Time For Learning', CO: 'Comp Off',
  WCO: 'Weekend Comp Off', WS: 'Weekend Shift'
};

const VALID_CATEGORIES = Object.keys(CATEGORY_NAMES);

async function triggerTeamsNotification(member, dates, category, reason) {
  if (!POWER_AUTOMATE_WEBHOOK || !POWER_AUTOMATE_API_KEY) {
    console.log('[INFO] Skipping Teams notification — POWER_AUTOMATE_WEBHOOK or POWER_AUTOMATE_API_KEY not configured.');
    return;
  }
  const sortedDates = [...dates].sort();
  const payload = {
    apiKey: POWER_AUTOMATE_API_KEY,
    employeeName: member,
    leaveType: `${category} - ${CATEGORY_NAMES[category] || category}`,
    startDate: sortedDates[0],
    endDate: sortedDates[sortedDates.length - 1],
    reason: reason || `${CATEGORY_NAMES[category] || category} recorded via Vacation Tracker`,
    totalDays: sortedDates.length
  };

  // 10-second timeout so a slow webhook never hangs the server
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const r = await fetch(POWER_AUTOMATE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    console.log(`[INFO] Teams notification sent for ${member} (${sortedDates.length} day(s)): HTTP ${r.status}`);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[ERROR] Teams notification timed out for', member);
    } else {
      console.error('[ERROR] Teams notification failed:', err.message);
    }
  } finally {
    clearTimeout(timer);
  }
}

// PINs stored in app code - never in data.json
const USER_PINS = {
  "Sunil Tanuku": "2711",
  "Kinsuk Kumar": "2605",
  "Vinod Kumar": "0202",
  "Neha Mishra": "0405",
  "Rachit Tandon": "1309",
  "Kaliprasad": "0705",
  "Rahul Raghava": "2812",
  "Meghana Podapati": "2907",
  "Neelakandan": "1611",
  "Susan": "2608",
  "Rashmi": "1911"
};

function readData(){ 
  try {
    if(fs.existsSync(DATA_FILE)){ 
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); 
      
      // Convert export format to server format if needed
      if (data.leaves && typeof data.leaves === 'object' && !Array.isArray(data.leaves)) {
        console.log('Converting export format to server format');
        const convertedLeaves = [];
        let id = 1;
        
        Object.entries(data.leaves).forEach(([member, categories]) => {
          Object.entries(categories).forEach(([category, leaves]) => {
            leaves.forEach(leave => {
              convertedLeaves.push({
                id: id++,
                member: member,
                date: leave.date,
                category: category,
                status: leave.status || 'approved',
                createdAt: leave.createdAt || new Date().toISOString()
              });
            });
          });
        });
        
        data.leaves = convertedLeaves;
        writeData(data); // Save converted format
      }
      
      if (!data.admins) data.admins = [];
      if (!data.members) data.members = [];
      if (!data.leaves) data.leaves = [];
      if (!data.shifts) data.shifts = {};
      if (!data.excludeFromOnDuty) data.excludeFromOnDuty = [];
      return data;
    }
  } catch(err) {
    console.error('Error reading data.json:', err.message);
  }
  return { admins: [], members: [], leaves: [], shifts: {}, excludeFromOnDuty: [] };
}

function writeData(d){ 
  try {
    if (!d.members || d.members.length === 0) {
      throw new Error('Cannot write data with empty members array');
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); 
  } catch(err) {
    console.error('Error writing data:', err.message);
    throw err;
  }
}

if(!fs.existsSync(DATA_FILE)){
  const defaultData = {
    admins: ["Sunil Tanuku"],
    members: ["Sunil Tanuku","Kinsuk Kumar","Vinod Kumar","Neha Mishra","Rachit Tandon","Kaliprasad","Rahul Raghava","Meghana Podapati","Neelakandan","Susan","Rashmi"],
    excludeFromOnDuty: ["Neelakandan","Susan","Rashmi"],
    leaves: [],
    shifts: {}
  };
  writeData(defaultData);
}

app.get('/api/members',(req,res)=>{ 
  try {
    console.log('GET /api/members');
    const d = readData(); 
    res.json({members:d.members, excludeFromOnDuty: d.excludeFromOnDuty || []}); 
  } catch(err) {
    console.error('Error in /api/members:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.get('/api/leaves',(req,res)=>{ 
  try {
    console.log('GET /api/leaves');
    const d = readData(); 
    res.json({leaves: d.leaves}); 
  } catch(err) {
    console.error('Error in /api/leaves:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.post('/api/leaves',(req,res)=>{ 
  try {
    const {member,date,category,isAdmin,reason}=req.body; 
    if(!member||!date||!category) return res.status(400).json({error:'member,date,category required'}); 
    
    const d = readData(); 
    
    // Check if leave already exists for this member and date
    const existingLeave = d.leaves.find(l => l.member === member && l.date === date);
    if (existingLeave) {
      return res.status(409).json({error:'Leave already exists for this date'});
    }
    
    const id=d.leaves.reduce((m,x)=>Math.max(m,x.id||0),0)+1; 
    const autoApprovedCategories = ['SL', 'WS', 'WCO'];
    const status = (isAdmin || autoApprovedCategories.includes(category)) ? 'approved' : 'pending';
    
    // WCO only allowed on Mondays for non-admins
    if (category === 'WCO' && !isAdmin) {
      const dayOfWeek = new Date(date).getDay();
      if (dayOfWeek !== 1) {
        return res.status(400).json({ error: 'WCO can only be applied on Mondays. Please reach out to Admin.' });
      }
    }
    const createdAt = new Date().toISOString(); 
    const rec = { id, member, date, category, status, createdAt }; 
    d.leaves.push(rec); 
    writeData(d);
    triggerTeamsNotification(member, [date], category, reason);
    res.json(rec); 
  } catch(err) {
    console.error('Error in POST /api/leaves:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.post('/api/leaves/batch',(req,res)=>{
  try {
    const {member, dates, category, isAdmin, reason} = req.body;
    if (!member || !dates || !Array.isArray(dates) || !category) {
      return res.status(400).json({error:'member, dates (array), category required'});
    }
    const d = readData();
    const autoApprovedCategories = ['SL', 'WS', 'WCO'];
    const status = (isAdmin || autoApprovedCategories.includes(category)) ? 'approved' : 'pending';
    const added = [];
    const skipped = [];

    for (const date of dates) {
      // Skip if leave already exists
      if (d.leaves.find(l => l.member === member && l.date === date)) {
        skipped.push(date);
        continue;
      }
      // WCO only on Mondays for non-admins
      if (category === 'WCO' && !isAdmin) {
        const dayOfWeek = new Date(date).getDay();
        if (dayOfWeek !== 1) { skipped.push(date); continue; }
      }
      const id = d.leaves.reduce((m,x) => Math.max(m, x.id||0), 0) + 1;
      const rec = { id, member, date, category, status, createdAt: new Date().toISOString() };
      d.leaves.push(rec);
      added.push(rec);
    }

    writeData(d);

    // Single notification for the whole batch
    if (added.length > 0) {
      const sortedDates = added.map(r => r.date).sort();
      triggerTeamsNotification(member, sortedDates, category, reason);
    }

    res.json({ added, skipped });
  } catch(err) {
    console.error('Error in POST /api/leaves/batch:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.delete('/api/leaves/:id',(req,res)=>{ 
  try {
    console.log('DELETE /api/leaves/' + req.params.id);
    const id=parseInt(req.params.id,10); 
    const d = readData(); 
    const idx=d.leaves.findIndex(l=>l.id===id); 
    if(idx===-1) return res.status(404).json({error:'not found'}); 
    const rec=d.leaves.splice(idx,1)[0]; 
    writeData(d); 
    res.json(rec); 
  } catch(err) {
    console.error('Error in DELETE /api/leaves:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.get('/api/onduty',(req,res)=>{ 
  try {
    console.log('GET /api/onduty:', req.query.date);
    const date=req.query.date; 
    if(!date) return res.status(400).json({error:'date required'}); 
    const d = readData(); 
    // Filter out members who are excluded from on-duty calculations
    const excludeFromOnDuty = d.excludeFromOnDuty || [];
    const eligibleMembers = d.members.filter(member => !excludeFromOnDuty.includes(member));
    const total = eligibleMembers.length; 
    const onLeave = d.leaves.filter(l => l.date === date && l.status === 'approved' && eligibleMembers.includes(l.member)).length; 
    const onDuty = total - onLeave; 
    const pct = total > 0 ? Math.round((onDuty/total)*100) : 100; 
    res.json({date,total,onLeave,onDuty,pct}); 
  } catch(err) {
    console.error('Error in /api/onduty:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.post('/api/members',(req,res)=>{ 
  try {
    console.log('POST /api/members:', req.body);
    const {name}=req.body; 
    if(!name || !name.trim()) return res.status(400).json({error:'name required'}); 
    const d = readData(); 
    if(d.members.includes(name.trim())) return res.status(400).json({error:'member already exists'}); 
    d.members.push(name.trim()); 
    writeData(d); 
    res.json({name:name.trim()}); 
  } catch(err) {
    console.error('Error in POST /api/members:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.put('/api/members/:name',(req,res)=>{ 
  try {
    console.log('PUT /api/members/' + req.params.name, req.body);
    const oldName=decodeURIComponent(req.params.name); 
    const {newName}=req.body;
    if(!newName || !newName.trim()) return res.status(400).json({error:'new name required'}); 
    const d = readData(); 
    const idx=d.members.indexOf(oldName); 
    if(idx===-1) return res.status(404).json({error:'member not found'}); 
    if(d.members.includes(newName.trim()) && newName.trim() !== oldName) return res.status(400).json({error:'member already exists'}); 
    d.members[idx] = newName.trim(); 
    d.leaves.forEach(l => { if(l.member === oldName) l.member = newName.trim(); }); 
    writeData(d); 
    res.json({oldName, newName:newName.trim()}); 
  } catch(err) {
    console.error('Error in PUT /api/members:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.delete('/api/members/:name',(req,res)=>{ 
  try {
    console.log('DELETE /api/members/' + req.params.name);
    const name=decodeURIComponent(req.params.name); 
    const d = readData(); 
    const idx=d.members.indexOf(name); 
    if(idx===-1) return res.status(404).json({error:'member not found'}); 
    d.members.splice(idx,1); 
    d.leaves = d.leaves.filter(l=>l.member !== name); 
    writeData(d); 
    res.json({name}); 
  } catch(err) {
    console.error('Error in DELETE /api/members:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

// ── POST /api/leave-request ──────────────────────────────────────────────────
// Dedicated endpoint that validates the payload then forwards to Power Automate.
// The webhook URL never leaves the server.
app.post('/api/leave-request', leaveRequestLimiter, async (req, res) => {
  try {
    const { member, dates, category } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!member || typeof member !== 'string' || !member.trim()) {
      return res.status(400).json({ error: 'member is required and must be a non-empty string.' });
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}.` });
    }
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'dates must be a non-empty array.' });
    }
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    const invalidDate = dates.find(d => !ISO_DATE.test(d) || isNaN(Date.parse(d)));
    if (invalidDate) {
      return res.status(400).json({ error: `Invalid date format: "${invalidDate}". Use YYYY-MM-DD.` });
    }
    if (dates.length > 90) {
      return res.status(400).json({ error: 'Cannot submit more than 90 days in a single request.' });
    }

    // Verify member exists in current data
    const d = readData();
    if (!d.members.includes(member.trim())) {
      return res.status(400).json({ error: 'Member not found.' });
    }

    if (!POWER_AUTOMATE_WEBHOOK || !POWER_AUTOMATE_API_KEY) {
      console.warn('[WARN] /api/leave-request called but POWER_AUTOMATE_WEBHOOK or POWER_AUTOMATE_API_KEY is not configured.');
      return res.status(503).json({ error: 'Notification service is not configured on this server.' });
    }

    // ── Forward to Power Automate ─────────────────────────────────────────────
    const sortedDates = [...dates].sort();
    const payload = {
      apiKey: POWER_AUTOMATE_API_KEY,
      employeeName: member.trim(),
      leaveType: `${category} - ${CATEGORY_NAMES[category]}`,
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1],
      reason: `${CATEGORY_NAMES[category]} recorded via Vacation Tracker`,
      totalDays: sortedDates.length
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    let webhookStatus;
    try {
      const r = await fetch(POWER_AUTOMATE_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      webhookStatus = r.status;
      console.log(`[INFO] /api/leave-request — Teams notified for ${member} (${sortedDates.length} day(s)): HTTP ${r.status}`);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('[ERROR] /api/leave-request — Teams webhook timed out for', member);
        return res.status(504).json({ error: 'Notification service timed out. Please try again.' });
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    res.json({ success: true, webhookStatus });
  } catch (err) {
    console.error('[ERROR] /api/leave-request:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/api/validate-pin', (req, res) => {
  try {
    const { member, pin } = req.body;
    if (USER_PINS[member] === pin) {
      res.json({ valid: true });
    } else {
      res.json({ valid: false });
    }
  } catch(err) {
    console.error('Error in POST /api/validate-pin:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.get('/api/admins',(req,res)=>{ 
  try {
    console.log('GET /api/admins');
    const d = readData(); 
    res.json({admins:d.admins||[]}); 
  } catch(err) {
    console.error('Error in /api/admins:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.post('/api/admins',(req,res)=>{ 
  try {
    console.log('POST /api/admins:', req.body);
    const {name}=req.body; 
    if(!name || !name.trim()) return res.status(400).json({error:'name required'}); 
    const d = readData(); 
    if(!d.admins) d.admins = [];
    if(d.admins.includes(name.trim())) return res.status(400).json({error:'already admin'}); 
    d.admins.push(name.trim()); 
    writeData(d); 
    res.json({name:name.trim()}); 
  } catch(err) {
    console.error('Error in POST /api/admins:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.put('/api/leaves/:id/approve',(req,res)=>{ 
  try {
    console.log('PUT /api/leaves/' + req.params.id + '/approve');
    const id=parseInt(req.params.id,10); 
    const d = readData(); 
    const leave=d.leaves.find(l=>l.id===id); 
    if(!leave) return res.status(404).json({error:'leave not found'}); 
    leave.status = 'approved'; 
    writeData(d); 
    res.json(leave); 
  } catch(err) {
    console.error('Error in PUT /api/leaves/approve:', err.message);
    res.status(500).json({error:'Internal server error'});
  }
});

app.get('/api/shifts', (req, res) => {
  try {
    console.log('GET /api/shifts');
    const data = readData();

    if (!data.shifts) data.shifts = {};

    res.json({ shifts: data.shifts });
  } catch (err) {
    console.error('Error in GET /api/shifts:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/shifts', (req, res) => {
  try {
    console.log('POST /api/shifts:', req.body);
    const { member, startDate, endDate, shift } = req.body;

    if (!member || !startDate || !endDate || !shift) {
      return res.status(400).json({ error: 'member, startDate, endDate, and shift are required' });
    }

    const data = readData();
    if (!data.shifts) data.shifts = {}; 
    if (!data.shifts[member]) data.shifts[member] = {}; 
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const updatedDates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      data.shifts[member][dateStr] = shift;
      updatedDates.push(dateStr);
    }

    writeData(data);

    res.json({
      member,
      shift,
      updatedDates,
      totalDatesForUser: Object.keys(data.shifts[member]).length,
    });
  } catch (err) {
    console.error('Error in POST /api/shifts:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/data', (req, res) => {
  try {
    console.log('GET /api/data');
    const data = readData();
    
    // Optimize shifts: convert individual dates to ranges
    const optimizedShifts = {};
    Object.keys(data.shifts || {}).forEach(member => {
      const memberShifts = data.shifts[member];
      // Skip if not flat date→string format
      if (typeof memberShifts !== 'object') return;
      const dates = Object.keys(memberShifts).filter(k => memberShifts[k] && typeof memberShifts[k] === 'string').sort();
      const ranges = [];

      if (dates.length > 0) {
        let start = dates[0];
        let currentShift = memberShifts[start];

        for (let i = 1; i < dates.length; i++) {
          const date = dates[i];
          const shift = memberShifts[date];

          if (shift !== currentShift) {
            ranges.push({ start, end: dates[i-1], shift: currentShift });
            start = date;
            currentShift = shift;
          }
        }
        ranges.push({ start, end: dates[dates.length-1], shift: currentShift });
      }

      optimizedShifts[member] = ranges;
    });
    
    // Optimize leaves: group by member, then by category
    const optimizedLeaves = {};
    (data.leaves || []).forEach(leave => {
      if (!optimizedLeaves[leave.member]) {
        optimizedLeaves[leave.member] = {};
      }
      if (!optimizedLeaves[leave.member][leave.category]) {
        optimizedLeaves[leave.member][leave.category] = [];
      }
      optimizedLeaves[leave.member][leave.category].push({
        date: leave.date,
        status: leave.status,
        createdAt: leave.createdAt
      });
    });
    
    const optimizedData = {
      admins: data.admins,
      members: data.members,
      excludeFromOnDuty: data.excludeFromOnDuty,
      leaves: optimizedLeaves,
      shifts: optimizedShifts
    };
    
    res.json(optimizedData);
  } catch (err) {
    console.error('Error in /api/data:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/import', (req, res) => {
  try {
    const imported = req.body;
    const data = readData();

    // Handle leaves in grouped format { member: { category: [{ date, status }] } }
    if (imported.leaves && !Array.isArray(imported.leaves)) {
      const expanded = [];
      let id = 1;
      Object.entries(imported.leaves).forEach(([member, categories]) => {
        Object.entries(categories).forEach(([category, leaves]) => {
          leaves.forEach(leave => {
            expanded.push({
              id: id++,
              member,
              date: leave.date,
              category,
              status: leave.status || 'approved',
              createdAt: leave.createdAt || new Date().toISOString()
            });
          });
        });
      });
      data.leaves = expanded;
    }

    // Handle shifts in range format { member: [{ start, end, shift }] }
    if (imported.shifts) {
      const expanded = {};
      Object.entries(imported.shifts).forEach(([member, ranges]) => {
        expanded[member] = {};
        (Array.isArray(ranges) ? ranges : []).forEach(({ start, end, shift }) => {
          if (!start || !end || !shift) return;
          const cur = new Date(start);
          const endDate = new Date(end);
          while (cur <= endDate) {
            expanded[member][cur.toISOString().split('T')[0]] = shift;
            cur.setDate(cur.getDate() + 1);
          }
        });
      });
      data.shifts = expanded;
    }

    if (imported.members) data.members = imported.members;
    if (imported.admins) data.admins = imported.admins;
    if (imported.excludeFromOnDuty) data.excludeFromOnDuty = imported.excludeFromOnDuty;
    // userPins intentionally NOT imported - PINs are managed separately and never exported

    writeData(data);
    res.json({ success: true, leavesRestored: data.leaves.length });
  } catch (err) {
    console.error('Error in POST /api/import:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all handler for React Router
app.get('*', (req, res) => {
  console.log(req.method, req.url);
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});