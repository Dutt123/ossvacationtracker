import React, { useState, useEffect } from 'react';
import { X, Calendar, CalendarDays } from 'lucide-react';
import { getFY, getWorkedFixedPHDates } from '../lib/leaveRules';

function validatePH(member, dates, leaves) {
  const existingPH = leaves.filter(l =>
    l.member === member && l.category === 'PH' && l.status !== 'rejected'
  );
  for (const dateStr of dates) {
    const fy = getFY(dateStr);
    const fyPH = existingPH.filter(l => getFY(l.date) === fy).map(l => l.date).sort();
    const newPHInFY = dates.filter(d => getFY(d) === fy);
    if (fyPH.length + newPHInFY.length > 2)
      return `You can only apply 2 Public Holidays per financial year. You have ${fyPH.length} already used.`;
    const allPH = [...fyPH, ...newPHInFY].sort();
    for (let i = 1; i < allPH.length; i++) {
      const diff = (new Date(allPH[i]) - new Date(allPH[i - 1])) / 86400000;
      if (diff === 1) return `Public Holidays cannot be on consecutive days.`;
    }
  }
  return null;
}

export default function LeaveRequestModal({ isOpen, onClose, onSubmit, members, categories, categoryNames, selectedDate, selectedMember: preSelectedMember, leaves = [] }) {
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWorkedPHDates, setSelectedWorkedPHDates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedMember(preSelectedMember || '');
      setStartDate(selectedDate || '');
      setEndDate(selectedDate || '');
      setSelectedCategory('');
      setSelectedWorkedPHDates([]);
    }
  }, [isOpen, preSelectedMember, selectedDate]);

  if (!isOpen) return null;

  const workedPHDates = selectedMember ? getWorkedFixedPHDates(selectedMember, leaves) : [];
  function toggleWorkedPH(date) {
    setSelectedWorkedPHDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  }

  const buildDates = () => {
    const dates = [];
    const dayMs = 24 * 60 * 60 * 1000;
    for (let ms = new Date(startDate).getTime(); ms <= new Date(endDate).getTime(); ms += dayMs) {
      const d = new Date(ms);
      dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    }
    return dates;
  };

  const handleSubmit = async () => {
    if (!selectedMember || !selectedCategory || !startDate || !endDate) return;

    const dates = buildDates();

    if (selectedCategory === 'PH') {
      const err = validatePH(selectedMember, dates, leaves);
      if (err) { alert(err); return; }
    }

    if (selectedCategory === 'CO') {
      if (workedPHDates.length === 0) {
        alert('You are not eligible for Comp Off. You have no Fixed Public Holidays that you worked on without availing PH leave.');
        return;
      }
      if (selectedWorkedPHDates.length === 0) {
        alert('Please select the Fixed Public Holiday date(s) you worked on to claim Comp Off.');
        return;
      }
      if (dates.length > selectedWorkedPHDates.length) {
        alert(`You can only apply ${selectedWorkedPHDates.length} CO day(s) based on the Fixed Public Holidays you worked.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const coReason = selectedCategory === 'CO' && selectedWorkedPHDates.length > 0
        ? `${selectedMember} is availing Comp Off for working on Fixed Public Holiday(s): ${selectedWorkedPHDates.join(', ')}`
        : null;

      if (dates.length === 1) {
        await onSubmit(selectedMember, dates[0], selectedCategory, false, coReason);
      } else {
        const res = await fetch('/api/leaves/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member: selectedMember, dates, category: selectedCategory, isAdmin: false, reason: coReason })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Batch submit failed'); }
        await onSubmit(null, null, null, true);
      }

      setSelectedMember(''); setSelectedCategory(''); setStartDate(''); setEndDate(''); setSelectedWorkedPHDates([]);
      onClose();
    } catch (err) {
      alert('Error submitting request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="request-modal">
        <div className="modal-header">
          <div className="modal-title">
            <Calendar size={24} />
            <h2>Request Leave</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-content">
          <div className="request-info">
            <p>Requesting leave for: <strong>{selectedMember}</strong></p>
          </div>

          <div className="form-section">
            <label><CalendarDays size={16} /> Date Range</label>
            <div className="date-range">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="date-input" />
              <span className="date-separator">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="date-input" />
            </div>
          </div>

          <div className="form-section">
            <label>Leave Type</label>
            <div className="leave-options">
              {Object.entries(categories).map(([code, color]) => {
                const isWcoBlocked = code === 'WCO' && startDate && new Date(startDate).getDay() !== 1;
                const phError = code === 'PH' && selectedMember && startDate ? validatePH(selectedMember, [startDate], leaves) : null;
                const isCOBlocked = code === 'CO' && selectedMember && workedPHDates.length === 0;
                const isBlocked = isWcoBlocked || !!phError || isCOBlocked;
                return (
                  <button
                    key={code}
                    className={`leave-option ${selectedCategory === code ? 'selected' : ''}`}
                    style={{
                      backgroundColor: selectedCategory === code ? color : 'transparent',
                      borderColor: isBlocked ? '#4b5563' : color,
                      opacity: isBlocked ? 0.5 : 1,
                      cursor: isBlocked ? 'not-allowed' : 'pointer'
                    }}
                    title={
                      isWcoBlocked ? 'WCO can only be applied on Mondays.' :
                      phError ? phError :
                      isCOBlocked ? 'No eligible Fixed Public Holidays worked. CO not available.' : ''
                    }
                    onClick={() => {
                      if (isWcoBlocked) { alert('WCO can only be applied on Mondays. Please reach out to Admin.'); return; }
                      if (phError) { alert(phError); return; }
                      if (isCOBlocked) { alert('You are not eligible for Comp Off. You have no Fixed Public Holidays that you worked on without availing PH leave.'); return; }
                      setSelectedCategory(code);
                      if (code !== 'CO') setSelectedWorkedPHDates([]);
                    }}
                  >
                    <div className="leave-code">{code}</div>
                    <div className="leave-name">{categoryNames[code]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PH blocked inline message */}
          {selectedMember && startDate && (() => {
            const err = validatePH(selectedMember, [startDate], leaves);
            return err ? <div className="ph-block-msg">{err}</div> : null;
          })()}

          {/* CO: worked PH date picker */}
          {selectedCategory === 'CO' && workedPHDates.length > 0 && (
            <div className="form-section">
              <label>Select Fixed Public Holiday(s) you worked on</label>
              <div className="co-ph-picker">
                {workedPHDates.map(ph => (
                  <button
                    key={ph.date}
                    className={`co-ph-option ${selectedWorkedPHDates.includes(ph.date) ? 'selected' : ''}`}
                    onClick={() => toggleWorkedPH(ph.date)}
                  >
                    <span className="co-ph-date">{ph.date}</span>
                    <span className="co-ph-desc">{ph.description}</span>
                  </button>
                ))}
              </div>
              {selectedWorkedPHDates.length > 0 && (
                <div className="co-ph-info">
                  {selectedWorkedPHDates.length} PH day(s) selected → max {selectedWorkedPHDates.length} CO day(s) allowed
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!selectedMember || !selectedCategory || !startDate || !endDate || isSubmitting ||
                (selectedCategory === 'CO' && selectedWorkedPHDates.length === 0)}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
