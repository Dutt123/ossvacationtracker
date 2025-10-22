import React from 'react';

export default function PublicHolidaysModal({ isOpen, onClose, holidays }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content2" onClick={e => e.stopPropagation()}>
        <h2>Public Holidays</h2>
        <table className="holiday-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h, idx) => (
              <tr key={idx}>
                <td>{h.date}</td>
                <td>{h.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="close-btn2" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
