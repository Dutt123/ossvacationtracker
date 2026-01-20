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

// Use current directory for data file
const DATA_FILE = './data.json';

// No need to ensure directory - using current directory

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

// Log the exact file path being used


if(!fs.existsSync(DATA_FILE)){
  const defaultData = {
    admins: ["Sunil Tanuku"],
    members: ["Sunil Tanuku","Kinsuk Kumar","Vinod Kumar","Neha Mishra","Rachit Tandon","Kaliprasad","Yash Gupta","Rahul Raghava","Meghana Podapati","Neelakandan","Susan","Rashmi"],
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
    const {member,date,category,isAdmin}=req.body; 
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
    
    // Optimize shifts: convert individual dates to ranges
    const optimizedShifts = {};
    Object.keys(data.shifts || {}).forEach(member => {
      const memberShifts = data.shifts[member];
      const ranges = [];
      const dates = Object.keys(memberShifts).sort();
      
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

// Catch-all handler for React Router
app.get('*', (req, res) => {
  console.log(req.method, req.url);
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});