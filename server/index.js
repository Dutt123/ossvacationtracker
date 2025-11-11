const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Use /home/data for persistence (limited)
const DATA_FILE = 'data.json';

// Ensure data directory exists
function ensureDataDirectory() {
  try {
    const dataDir = 'C:/home/data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {
    console.error('Error creating data directory:', err.message);
  }
}

ensureDataDirectory();

function readData(){ 
  try {
    if(fs.existsSync(DATA_FILE)){ 
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); 
      console.log('Read from data.json - Members:', data.members?.length, 'Leaves:', data.leaves?.length);
      // Ensure all required properties exist
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
  
  console.log('Data file not found, returning empty structure');
  return { admins: [], members: [], leaves: [], shifts: {}, excludeFromOnDuty: [] };
}

function writeData(d){ 
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); 
    console.log('Wrote data. Members:', d.members?.length, 'Leaves:', d.leaves?.length);
  } catch(err) {
    console.error('Error writing data:', err.message);
    throw err;
  }
}

// Initialize data on startup - only if data.json doesn't exist
if(!fs.existsSync(DATA_FILE)){
  console.log('No data file found, creating with defaults');
  const defaultData = {
    admins: ["Sunil Tanuku"],
    members: ["Sunil Tanuku","Kinsuk Kumar","Vinod Kumar","Neha Mishra","Rachit Tandon","Kaliprasad","Yash Gupta","Rahul Raghava","Meghana Podapati"],
    leaves: [{"id":1,"member":"Rahul Raghava","date":"2025-10-02","category":"AL","status":"approved"},{"id":2,"member":"Yash Gupta","date":"2025-10-15","category":"AL","status":"approved"}]
  };
  writeData(defaultData);
} else {
  console.log('Data file exists, using existing data');
  // Only fix missing status fields in existing data
  const data = readData();
  let updated = false;
  if(data.leaves) {
    data.leaves.forEach(leave => {
      if(!leave.status) {
        leave.status = 'approved';
        updated = true;
      }
    });
  }
  if(!data.admins) {
    data.admins = ["Sunil Tanuku"];
    updated = true;
  }
  if(updated) {
    console.log('Updated existing data with missing fields');
    writeData(data);
  }
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
    console.log('POST /api/leaves:', req.body);
    const {member,date,category,isAdmin}=req.body; 
    if(!member||!date||!category) return res.status(400).json({error:'member,date,category required'}); 
    const d = readData(); 
    const id=d.leaves.reduce((m,x)=>Math.max(m,x.id||0),0)+1; 
    // Auto-approved categories: SL, WS, WCO - others need admin approval or are pending
    const autoApprovedCategories = ['SL', 'WS', 'WCO'];
    const status = (isAdmin || autoApprovedCategories.includes(category)) ? 'approved' : 'pending';
    const createdAt = new Date().toISOString(); 
    const rec = { id, member, date, category, status, createdAt }; 
    d.leaves.push(rec); 
    writeData(d); 
    res.json(rec); 
  } catch(err) {
    console.error('Error in POST /api/leaves:', err.message);
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
    const { member, startDate, endDate, shift } = req.body.startDate || req.body;

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
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      const dateStr = d.toISOString().split('T')[0];
      data.shifts[member][dateStr] = shift;
      updatedDates.push(dateStr);
    }

    writeData(data); 

    console.log(data);

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
    res.json(data);
  } catch (err) {
    console.error('Error in /api/data:', err.message);
    res.status(500).json({ error: 'Internal server error' });
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
});