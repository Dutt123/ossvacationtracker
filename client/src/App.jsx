import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import Calendar from './components/Calendar'
import Dashboard from './components/Dashboard'
import TeamModal from './components/TeamModal'
import PinModal from './components/PinModal'
import HolidaysModal from './components/HolidaysModal'
import PHSummaryModal from './components/PHSummaryModal'

const CATEGORIES = {
  SL: '#ef4444', PL: '#22c55e', CGL: '#f59e0b', PH: '#8b5cf6',
  TFL: '#06b6d4', CO: '#ec4899', WCO: '#f97316', WS: '#6366f1'
};

const SHIFT_COLORS = { IST: '#fbbf24', APAC: '#34d399', EMEA: '#60a5fa' };

const CATEGORY_NAMES = {
  SL: 'Sick Leave', PL: 'Planned Leave', CGL: 'Caregiver Leave',
  PH: 'Public Holiday', TFL: 'Time For Learning', CO: 'Comp Off',
  WCO: 'Weekend Comp Off', WS: 'Weekend Shift'
};

const PUBLIC_HOLIDAYS = [
  { date: '15 Aug 2025', description: 'Independence Day (Fixed)' },
  { date: '27 Aug 2025', description: 'Ganesh Chaturthi (Optional)' },
  { date: '5 Sep 2025', description: 'Id-Milad/Onam (Optional)' },
  { date: '2 Oct 2025', description: 'Gandhi Jayanti (Fixed)' },
  { date: '20 Oct 2025', description: 'Diwali (Fixed)' },
  { date: '21 Oct 2025', description: 'Diwali(Lakshmi Puja) (Optional)' },
  { date: '28 Oct 2025', description: 'Chath Puja (Optional)' },
  { date: '5 Nov 2025', description: 'Guru Nanak Jayanti (Optional)' },
  { date: '25 Dec 2025', description: 'Christmas (Fixed)' },
  { date: '1 Jan 2026', description: "New Year's Day (Fixed)" },
  { date: '15 Jan 2026', description: 'Pongal/Sankranti (Optional)' },
  { date: '26 Jan 2026', description: 'Republic Day (Fixed)' },
  { date: '4 Mar 2026', description: 'Holi (Fixed)' },
  { date: '19 Mar 2026', description: 'Ugadi/Gudi Padwa (Optional)' },
  { date: '26 Mar 2026', description: 'Ram Navami (Optional)' },
  { date: '31 Mar 2026', description: 'Mahavir Jayanti (Optional)' },
  { date: '3 Apr 2026', description: 'Good Friday (Optional)' },
  { date: '14 Apr 2026', description: "Tamil New Year's Day/Ambedkar Jayanti (Optional)" },
  { date: '1 May 2026', description: 'May Day(Labour Day) (Fixed)' },
  { date: '28 May 2026', description: 'Bakri-Id (Fixed)' },
  { date: '2 Jun 2026', description: 'Telangana State Formation Day (Fixed)' },
];

export default function App() {
  const [members, setMembers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [excludeFromOnDuty, setExcludeFromOnDuty] = useState([]);
  const [isAdminMode, setIsAdminMode] = useState(false);
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

  useEffect(() => { fetchData(); }, []);

  function fetchData() {
    axios.get('/api/members').then(r => {
      setMembers(r.data.members);
      setExcludeFromOnDuty(r.data.excludeFromOnDuty || []);
    });
    axios.get('/api/leaves').then(r => setLeaves(r.data.leaves));
    axios.get('/api/admins').then(r => setAdmins(r.data.admins));
    axios.get('/api/shifts').then(r => setShifts(r.data.shifts));
  }

  function addLeave(member, date, category, refreshOnly = false) {
    if (refreshOnly) { fetchData(); return; }
    axios.post('/api/leaves', { member, date, category, isAdmin: isAdminMode }).then(() => fetchData());
  }

  function delLeave(id) { axios.delete('/api/leaves/' + id).then(() => fetchData()); }

  async function handleAddMember(name) { await axios.post('/api/members', { name }); fetchData(); }
  async function handleRemoveMember(name) { await axios.delete('/api/members/' + encodeURIComponent(name)); fetchData(); }
  async function handleEditMember(oldName, newName) { await axios.put('/api/members/' + encodeURIComponent(oldName), { newName }); fetchData(); }
  async function handleAddAdmin(name) { await axios.post('/api/admins', { name }); fetchData(); }
  async function handleApproveLeave(leaveId) { await axios.put('/api/leaves/' + leaveId + '/approve'); fetchData(); }

  function updateShift(member, startDate, endDate, shift) {
    axios.post('/api/shifts', { member, startDate, endDate, shift }).then(() => fetchData());
  }

  function handlePinValidation(member, callback) {
    setValidatingMember(member);
    setPinValidationCallback(() => callback);
    setShowPinModal(true);
  }

  async function handlePinSuccess(pin) {
    if (validatingMember) {
      try {
        const res = await fetch('/api/validate-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member: validatingMember, pin })
        });
        const result = await res.json();
        if (result.valid && pinValidationCallback) {
          pinValidationCallback();
          setShowPinModal(false);
          setValidatingMember('');
          setPinValidationCallback(null);
          setPinError('');
        } else {
          setPinError('Invalid PIN for ' + validatingMember);
        }
      } catch { alert('Authentication failed'); }
    } else {
      const now = new Date();
      const expectedPin = (now.getFullYear() + now.getMonth() + 1).toString();
      if (pin === expectedPin) {
        setIsAdminMode(true);
        setShowPinModal(false);
        setPinError('');
        if (adminTimeout) clearTimeout(adminTimeout);
        setAdminTimeout(setTimeout(() => setIsAdminMode(false), 30 * 60 * 1000));
      } else {
        setPinError('Invalid Admin PIN');
      }
    }
  }

  function handleAdminLogout() {
    setIsAdminMode(false);
    if (adminTimeout) { clearTimeout(adminTimeout); setAdminTimeout(null); }
  }

  const handleExport = useCallback(async () => {
    const res = await fetch('/api/data');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vacation-data-${month.format('MMMM-YYYY')}.json`;
    a.click(); URL.revokeObjectURL(url);
  }, [month]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const res = await fetch('/api/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: await file.text()
      });
      const result = await res.json();
      if (result.success) { alert(`Restored ${result.leavesRestored} leave records.`); fetchData(); }
      else alert('Import failed: ' + result.error);
    };
    input.click();
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-left">
          <h1>Vacation Tracker</h1>
          <div className="view-toggle">
            <button className={`view-toggle-btn${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}>📅 Calendar</button>
            <button className={`view-toggle-btn${view === 'dashboard' ? ' active' : ''}`} onClick={() => setView('dashboard')}>📊 Dashboard</button>
          </div>
          {isAdminMode && <span className="admin-badge">Admin Mode</span>}
        </div>
        <div className="actions">
          {isAdminMode && <button onClick={() => setShowTeamModal(true)}>Manage Team</button>}
          {isAdminMode && <button onClick={() => setPhSummaryOpen(true)}>PH Summary</button>}
          {isAdminMode && <button onClick={handleExport}>Export</button>}
          {isAdminMode && <button onClick={handleImport}>Import</button>}
          {isAdminMode
            ? <button onClick={handleAdminLogout}>Admin Logout</button>
            : <>
                <button className="admin-login-btn" onClick={() => setShowPinModal(true)}>Admin</button>
                <button onClick={() => setHolidaysModalOpen(true)}>Public Holidays</button>
              </>
          }
        </div>
      </header>

      <main className="container">
        <div className="main">
          {view === 'calendar' ? (
            <>
              <div className="monthselector">
                <button onClick={() => setMonth(month.subtract(1, 'month'))}>&lt;</button>
                <div>{month.format('MMMM YYYY')}</div>
                <button onClick={() => setMonth(month.add(1, 'month'))}>&gt;</button>
              </div>
              <div className="leave-legend">
                {Object.entries(CATEGORIES).map(([code, color]) => (
                  <div key={code} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: color }} />
                    <span className="legend-text">{code} - {CATEGORY_NAMES[code]}</span>
                  </div>
                ))}
                {Object.entries(SHIFT_COLORS).map(([name, color]) => (
                  <div key={name} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: color }} />
                    <span className="legend-text">{name}</span>
                  </div>
                ))}
              </div>
              <Calendar
                members={members} leaves={leaves} shifts={shifts} month={month}
                categories={CATEGORIES} categoryNames={CATEGORY_NAMES}
                onAdd={addLeave} onDel={delLeave} onApprove={handleApproveLeave}
                isAdmin={isAdminMode} onPinValidation={handlePinValidation}
                onUpdateShift={updateShift} excludeFromOnDuty={excludeFromOnDuty}
              />
            </>
          ) : (
            <Dashboard members={members} leaves={leaves} excludeFromOnDuty={excludeFromOnDuty} />
          )}
        </div>
      </main>

      <footer className="footer">Made with ♥ for OSS team</footer>

      <TeamModal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} members={members} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} onEditMember={handleEditMember} />
      <PinModal isOpen={showPinModal} onClose={() => { setShowPinModal(false); setValidatingMember(''); setPinValidationCallback(null); setPinError(''); }} onSuccess={handlePinSuccess} title={validatingMember ? `Enter PIN for ${validatingMember}` : 'Enter Admin PIN'} error={pinError} onClearError={() => setPinError('')} />
      <PHSummaryModal isOpen={phSummaryOpen} onClose={() => setPhSummaryOpen(false)} members={members} leaves={leaves} holidays={PUBLIC_HOLIDAYS} year={month.format('YYYY')} />
      <HolidaysModal isOpen={holidaysModalOpen} onClose={() => setHolidaysModalOpen(false)} holidays={PUBLIC_HOLIDAYS} />
    </div>
  );
}
