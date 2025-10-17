import React from 'react';

export default function LeaveModal({ isOpen, onClose, onSelect, categories, categoryNames }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Select Leave Type</h3>
        <div className="leave-options">
          {Object.entries(categories).map(([code, color]) => (
            <button
              key={code}
              className="leave-option"
              style={{ 
                backgroundColor: color,
                color: 'white'
              }}
              onClick={() => {
                onSelect(code);
                onClose();
              }}
            >
              <div className="leave-code">{code}</div>
              <div className="leave-name">{categoryNames[code]}</div>
            </button>
          ))}
        </div>
        <button className="modal-close" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}