
import React, {useEffect, useState} from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import Calendar from './components/Calendar'
import Dashboard from './components/Dashboard'
import TeamModal from './components/TeamModal'
import PinModal from './components/PinModal'
import PublicHolidaysModal from './components/PublicHolidaysModal'
import PHSummaryModal from './components/PHSummaryModal'
import { GradientBackground } from './components/ui/gradient-background'

const CATEGORIES = {
  SL: '#ef4444',    // Sick Leave - Red
  PL: '#22c55e',    // Planned Leave - Green
  CGL: '#f59e0b',   // Caregiver Leave - Orange
  PH: '#8b5cf6',    // Public Holiday - Purple
  TFL: '#06b6d4',   // Time For Learning - Cyan
  CO: '#ec4899',    // Comp Off - Pink
  WCO: '#f97316',   // Weekend Comp Off - Orange
  WS: '#6366f1'     // Weekend Shift - Indigo
};

const SHIFT_COLORS = {
  "IST": "#fbbf24",   // vibrant amber
  "APAC": "#34d399",  // vibrant emerald
  "EMEA": "#60a5fa"   // vibrant blue
};

const CATEGORY_NAMES = {
  SL: 'Sick Leave',
  PL: 'Planned Leave', 
  CGL: 'Caregiver Leave',
  PH: 'Public Holiday',
  TFL: 'Time For Learning',
  CO: 'Comp Off',
  WCO: 'Weekend Comp Off',
  WS: 'Weekend Shift'
};

const PUBLIC_HOLIDAYS = [
  // 2025 Holidays
  { date: '15 Aug 2025', description: 'Independence Day (Fixed)' },
  { date: '27 Aug 2025', description: 'Ganesh Chaturthi (Optional)' },
  { date: '5 Sep 2025', description: 'Id-Milad/Onam (Optional)' },
  { date: '2 Oct 2025', description: 'Gandhi Jayanti (Fixed)' },
  { date: '20 Oct 2025', description: 'Diwali (Fixed)' },
  { date: '21 Oct 2025', description: 'Diwali(Lakshmi Puja) (Optional)' },
  { date: '28 Oct 2025', description: 'Chath Puja (Optional)' },
  { date: '5 Nov 2025', description: 'Guru Nanak Jayanti (Optional)' },
  { date: '25 Dec 2025', description: 'Christmas (Fixed)' },
  // 2026 Holidays
  { date: '26 Aug 2026', description: 'Id-E-Milad/Onam (Optional)' },
  { date: '28 Aug 2026', description: 'Raksha Bandhan (Optional)' },
  { date: '14 Sep 2026', description: 'Ganesh Chaturthi (Optional)' },
  { date: '2 Oct 2026', description: 'Gandhi Jayanti (Fixed)' },
  { date: '21 Oct 2026', description: 'Dussehra (Fixed)' },
  { date: '10 Nov 2026', description: 'Bali Padyami (Optional)' },
  { date: '24 Nov 2026', description: 'Guru Nanak Jayani (Optional)' },
  { date: '25 Dec 2026', description: 'Christmas (Fixed)' },
];

export default function App(){
  const [members,setMembers] = useState([]);
  const [leaves,setLeaves] = useState([]);
  const [shifts,setShifts] = useState([]);
  const [admins,setAdmins] = useState([]);
  const [excludeFromOnDuty,setExcludeFromOnDuty] = useState([]);
  const [isAdminMode,setIsAdminMode] = useState(false);
  const [view, setView] = useState('calendar');
  const [month, setMonth] = useState(dayjs());
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValidationCallback, setPinValidationCallback] = useState(null);
  const [validatingMember, setValidatingMember] = useState('');
  const [adminTimeout, setAdminTimeout] = useState(null);
  const [pinError, setPinError] = useState('');
  const [holidaysModalOpen, setHolidaysModalOpen] = useState(false);
  const [phSummaryOpen, setPhSummaryOpen] = useState(false);
  useEffect(()=>{ fetchData(); },[]);
  function fetchData(){
    axios.get('/api/members').then(r=>{
      setMembers(r.data.members);
      setExcludeFromOnDuty(r.data.excludeFromOnDuty || []);
    });
    axios.get('/api/leaves').then(r=>setLeaves(r.data.leaves));
    axios.get('/api/admins').then(r=>setAdmins(r.data.admins));
    axios.get('/api/shifts').then(r=>setShifts(r.data.shifts));
  }
  function addLeave(member, date, category, refreshOnly = false, reason = null){
    if (refreshOnly) { fetchData(); return; }
    axios.post('/api/leaves',{member,date,category,isAdmin:isAdminMode,reason}).then(()=>fetchData());
  }
  function delLeave(id){ axios.delete('/api/leaves/'+id).then(()=>fetchData()); }
  
  async function handleAddMember(name) {
    await axios.post('/api/members', {name});
    fetchData();
  }
  
  async function handleRemoveMember(name) {
    await axios.delete('/api/members/' + encodeURIComponent(name));
    fetchData();
  }
  
  async function handleEditMember(oldName, newName) {
    await axios.put('/api/members/' + encodeURIComponent(oldName), {newName});
    fetchData();
  }
  
  async function handleAddAdmin(name) {
    await axios.post('/api/admins', {name});
    fetchData();
  }
  
  async function handleApproveLeave(leaveId) {
    await axios.put('/api/leaves/' + leaveId + '/approve');
    fetchData();
  }

  function updateShift(member, startDate, endDate, shift) {
    axios.post('/api/shifts', { member, startDate, endDate, shift }).then(()=>fetchData());
  }
  
  function handlePinValidation(member, callback) {
    setValidatingMember(member);
    setPinValidationCallback(() => callback);
    setShowPinModal(true);
  }
  
  async function handlePinSuccess(pin) {
    if (validatingMember) {
      try {
        const response = await fetch('/api/validate-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member: validatingMember, pin })
        });
        
        const result = await response.json();
        
        if (result.valid && pinValidationCallback) {
          pinValidationCallback();
          setShowPinModal(false);
          setValidatingMember('');
          setPinValidationCallback(null);
          setPinError('');
        } else {
          setPinError('Invalid PIN for ' + validatingMember);
        }
      } catch (err) {
        alert('Authentication failed');
      }
    } else {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const expectedPin = (currentYear + currentMonth).toString();
      
      if (pin === expectedPin) {
        setIsAdminMode(true);
        setShowPinModal(false);
        setPinError('');
        if (adminTimeout) clearTimeout(adminTimeout);
        const timeout = setTimeout(() => {
          setIsAdminMode(false);
        }, 30 * 60 * 1000);
        setAdminTimeout(timeout);
      } else {
        setPinError('Invalid Admin PIN');
      }
    }
  }
  
  function handleAdminLogin() {
    setShowPinModal(true);
  }
  

  
  function handleAdminLogout() {
    setIsAdminMode(false);
    if (adminTimeout) {
      clearTimeout(adminTimeout);
      setAdminTimeout(null);
    }
  }
  return (
    <GradientBackground 
      gradients={[
        "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        "linear-gradient(135deg, #334155 0%, #475569 100%)",
        "linear-gradient(135deg, #475569 0%, #0f172a 100%)"
      ]}
      animationDuration={12}
      overlay={false}
    >
      <div className="page">
        <header className="topbar">
        <div className="topbar-left">
          <h1>Vacation Tracker</h1>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn${view === 'calendar' ? ' active' : ''}`}
              onClick={() => setView('calendar')}
            >📅 Calendar</button>
            <button
              className={`view-toggle-btn${view === 'dashboard' ? ' active' : ''}`}
              onClick={() => setView('dashboard')}
            >📊 Dashboard</button>
          </div>
          {isAdminMode && (
            <div className="user-info">
              <span className="admin-badge">Admin Mode</span>
            </div>
          )}
        </div>
        <div className="actions">
          {isAdminMode && <button onClick={()=>setShowTeamModal(true)}>Manage Team</button>}
          {isAdminMode && <button onClick={() => setPhSummaryOpen(true)}>PH Summary</button>}
          {isAdminMode && <button onClick={()=>{ const name=prompt('Add admin (select from team):'); if(name && members.includes(name)) handleAddAdmin(name); else if(name) alert('Person not in team'); }}>Add Admin</button>}
          {isAdminMode && <button onClick={async ()=>{ 
            const monthName = month.format('MMMM-YYYY'); 
            const response = await fetch('/api/data');
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `vacation-data-${monthName}.json`;
            link.click();
            URL.revokeObjectURL(url);
          }}>Export Backup</button>}
          {isAdminMode && <button onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const text = await file.text();
              const compressed = JSON.parse(text);
              const res = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(compressed)
              });
              const result = await res.json();
              if (result.success) {
                alert(`Restored ${result.leavesRestored} leave records.`);
                fetchData();
              } else {
                alert('Import failed: ' + result.error);
              }
            };
            input.click();
          }}>Import Backup</button>}
          {isAdminMode ? (
            <button onClick={handleAdminLogout}>Admin Logout</button>
          ) : (
            <>
              <button className="admin-login-btn" onClick={handleAdminLogin}>Admin</button>
              <button onClick={() => setHolidaysModalOpen(true)}>Public Holidays</button>
            </>
          )}
        </div>
      </header>
      <main className="container">
        <div className="main">
          {view === 'calendar' ? (
            <>
              <div className="monthselector">
                <button onClick={()=>setMonth(month.subtract(1,'month'))}>&lt;</button>
                <div>{month.format('MMMM YYYY')}</div>
                <button onClick={()=>setMonth(month.add(1,'month'))}>&gt;</button>
              </div>
              
              {/* Leave Categories Legend */}
              <div className="leave-legend">
                {Object.entries(CATEGORIES).map(([code, color]) => (
                  <div key={code} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: color }}></div>
                    <span className="legend-text">{code} - {CATEGORY_NAMES[code]}</span>
                  </div>
                ))}
                {Object.entries(SHIFT_COLORS).map(([shiftName, color]) => (
                  <div key={shiftName} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: color }}></div>
                    <span className="legend-text">{shiftName}</span>
                  </div>
                ))}
              </div>
              
              <Calendar 
                members={members} 
                leaves={leaves} 
                shifts={shifts} 
                month={month} 
                categories={CATEGORIES} 
                categoryNames={CATEGORY_NAMES} 
                onAdd={addLeave} 
                onDel={delLeave}
                onApprove={handleApproveLeave}
                isAdmin={isAdminMode}
                onPinValidation={handlePinValidation}
                onUpdateShift={updateShift}
                excludeFromOnDuty={excludeFromOnDuty}
              />
            </>
          ) : (
            <Dashboard members={members} leaves={leaves} />
          )}
        </div>
      </main>
        <footer className="footer">
          Made with ♥ for OSS team
        </footer>
        
        <TeamModal 
          isOpen={showTeamModal}
          onClose={()=>setShowTeamModal(false)}
          members={members}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onEditMember={handleEditMember}
        />
        
        <PinModal 
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false);
            setValidatingMember('');
            setPinValidationCallback(null);
            setPinError('');
          }}
          onSuccess={handlePinSuccess}
          title={validatingMember ? `Enter PIN for ${validatingMember}` : 'Enter Admin PIN'}
          error={pinError}
          onClearError={() => setPinError('')}
        />
        
        <PHSummaryModal
          isOpen={phSummaryOpen}
          onClose={() => setPhSummaryOpen(false)}
          members={members}
          leaves={leaves}
          holidays={PUBLIC_HOLIDAYS}
          year={month.format('YYYY')}
        />

        <PublicHolidaysModal 
          isOpen={holidaysModalOpen}
          onClose={() => setHolidaysModalOpen(false)}
          holidays={PUBLIC_HOLIDAYS}
        />
      </div>
    </GradientBackground>
  )
}
