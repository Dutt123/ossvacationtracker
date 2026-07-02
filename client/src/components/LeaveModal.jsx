import React from 'react';
import dayjs from 'dayjs';

function getFY(dateStr) {
  const d = new Date(dateStr);
  const m = d.getMonth(); // 0-based
  return m >= 6 ? d.getFullYear() : d.getFullYear() - 1; // FY starts July
}

function validatePH(member, dateStr, leaves) {
  const fy = getFY(dateStr);
  const memberPH = leaves.filter(l =>
    l.member === member &&
    l.category === 'PH' &&
    l.status !== 'rejected' &&
    getFY(l.date) === fy
  ).map(l => l.date).sort();

  if (memberPH.length >= 2) {
    return `You have already used 2 Public Holidays this financial year (max allowed: 2).`;
  }

  // Check consecutive — is the new date adjacent to any existing PH?
  const d = new Date(dateStr);
  const prev = new Date(d); prev.setDate(prev.getDate() - 1);
  const next = new Date(d); next.setDate(next.getDate() + 1);
  const fmt = dt => dt.toISOString().split('T')[0];

  if (memberPH.includes(fmt(prev)) || memberPH.includes(fmt(next))) {
    return `Public Holidays cannot be on consecutive days.`;
  }

  return null;
}

export default function LeaveModal({ isOpen, onClose, onSelect, categories, categoryNames, selectedDate, selectedMember, leaves = [], isAdmin }) {
  if (!isOpen) return null;

  const isMonday = selectedDate ? dayjs(selectedDate).day() === 1 : true;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Select Leave Type</h3>
        <div className="leave-options">
          {Object.entries(categories).map(([code, color]) => {
            const isWcoBlocked = code === 'WCO' && !isAdmin && !isMonday;
            const phError = code === 'PH' && !isAdmin && selectedDate && selectedMember
              ? validatePH(selectedMember, selectedDate, leaves)
              : null;
            const isBlocked = isWcoBlocked || !!phError;
            return (
              <button
                key={code}
                className="leave-option"
                style={{ 
                  backgroundColor: isBlocked ? '#4b5563' : color,
                  color: 'white',
                  opacity: isBlocked ? 0.5 : 1,
                  cursor: isBlocked ? 'not-allowed' : 'pointer'
                }}
                onClick={() => {
                  if (isWcoBlocked) { alert('WCO can only be applied on Mondays. Please reach out to Admin.'); return; }
                  if (phError) { alert(phError); return; }
                  onSelect(code);
                  onClose();
                }}
              >
                <div className="leave-code">{code}</div>
                <div className="leave-name">{categoryNames[code]}</div>
              </button>
            );
          })}
        </div>
        <button className="modal-close" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}