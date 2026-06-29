import React from 'react';
import dayjs from 'dayjs';

export default function LeaveModal({ isOpen, onClose, onSelect, categories, categoryNames, selectedDate, isAdmin }) {
  if (!isOpen) return null;

  const isMonday = selectedDate ? dayjs(selectedDate).day() === 1 : true;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Select Leave Type</h3>
        <div className="leave-options">
          {Object.entries(categories).map(([code, color]) => {
            const isWcoBlocked = code === 'WCO' && !isAdmin && !isMonday;
            return (
              <button
                key={code}
                className="leave-option"
                style={{ 
                  backgroundColor: isWcoBlocked ? '#4b5563' : color,
                  color: 'white',
                  opacity: isWcoBlocked ? 0.5 : 1,
                  cursor: isWcoBlocked ? 'not-allowed' : 'pointer'
                }}
                onClick={() => {
                  if (isWcoBlocked) {
                    alert('WCO can only be applied on Mondays. Please reach out to Admin.');
                    return;
                  }
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