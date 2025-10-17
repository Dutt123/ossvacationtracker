
import React, {useEffect, useState} from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import Calendar from './components/Calendar'
import OndutyBar from './components/OndutyBar'
import TeamModal from './components/TeamModal'
import LoginScreen from './components/LoginScreen'
import PinModal from './components/PinModal'
import { GradientBackground } from './components/ui/gradient-background'

const CATEGORIES = {
  SL: '#ef4444',    // Sick Leave - Red
  PL: '#22c55e',    // Planned Leave - Green
  CGL: '#f59e0b',   // Caregiver Leave - Orange
  PH: '#8b5cf6',    // Public Holiday - Purple
  TFL: '#06b6d4',   // Time For Learning - Cyan
  CO: '#ec4899'     // Comp Off - Pink
};

const CATEGORY_NAMES = {
  SL: 'Sick Leave',
  PL: 'Planned Leave', 
  CGL: 'Caregiver Leave',
  PH: 'Public Holiday',
  TFL: 'Time For Learning',
  CO: 'Comp Off'
};

export default function App(){
  const [members,setMembers] = useState([]);
  const [leaves,setLeaves] = useState([]);
  const [admins,setAdmins] = useState([]);
  const [isAdminMode,setIsAdminMode] = useState(false);
  const [month, setMonth] = useState(dayjs());
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [adminTimeout, setAdminTimeout] = useState(null);
  useEffect(()=>{ fetchData(); },[]);
  function fetchData(){
    axios.get('/api/members').then(r=>setMembers(r.data.members));
    axios.get('/api/leaves').then(r=>setLeaves(r.data.leaves));
    axios.get('/api/admins').then(r=>setAdmins(r.data.admins));
  }
  function addLeave(member,date,category){
    axios.post('/api/leaves',{member,date,category,isAdmin:isAdminMode}).then(()=>fetchData());
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
  
  function handleAdminLogin() {
    setShowPinModal(true);
  }
  
  function handlePinSuccess() {
    setIsAdminMode(true);
    // Auto-logout after 30 minutes
    if (adminTimeout) clearTimeout(adminTimeout);
    const timeout = setTimeout(() => {
      setIsAdminMode(false);
      alert('Admin session expired');
    }, 30 * 60 * 1000);
    setAdminTimeout(timeout);
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
          {isAdminMode && (
            <div className="user-info">
              <span className="admin-badge">Admin Mode</span>
            </div>
          )}
        </div>
        <div className="actions">
          {isAdminMode && <button onClick={()=>setShowTeamModal(true)}>Manage Team</button>}
          {isAdminMode && <button onClick={()=>{ const name=prompt('Add admin (select from team):'); if(name && members.includes(name)) handleAddAdmin(name); else if(name) alert('Person not in team'); }}>Add Admin</button>}
          {isAdminMode && <button onClick={()=>{ 
            const yyyy = month.format('YYYY-MM'); 
            const link = document.createElement('a');
            link.href = '/api/report/month/' + yyyy;
            link.download = `leaves-${yyyy}.csv`;
            link.click();
          }}>Export</button>}
          {isAdminMode ? (
            <button onClick={handleAdminLogout}>Admin Logout</button>
          ) : (
            <button className="admin-login-btn" onClick={handleAdminLogin}>Admin</button>
          )}
        </div>
      </header>
      <main className="container">
        <div className="main">
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
          </div>
          
          <Calendar 
            members={members} 
            leaves={leaves} 
            month={month} 
            categories={CATEGORIES} 
            categoryNames={CATEGORY_NAMES} 
            onAdd={addLeave} 
            onDel={delLeave}
            onApprove={handleApproveLeave}
            currentUser={null}
            isAdmin={isAdminMode}
          />
        </div>
      </main>
        <footer className="footer">
          Made with ♥ for your team
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
          onClose={() => setShowPinModal(false)}
          onSuccess={handlePinSuccess}
        />
      </div>
    </GradientBackground>
  )
}
