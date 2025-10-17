import React from 'react';

export default function LeaveDetailsModal({ isOpen, onClose, leave, categoryNames, onDelete, onApprove, canDelete, canApprove }) {
  if (!isOpen || !leave) return null;

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Leave Details</h3>
        <div className="leave-details">
          <div className="detail-row">
            <strong>Employee:</strong> {leave.member}
          </div>
          <div className="detail-row">
            <strong>Leave Date:</strong> {leave.date}
          </div>
          <div className="detail-row">
            <strong>Leave Type:</strong> {leave.category} - {categoryNames[leave.category] || 'Unknown'}
          </div>
          <div className="detail-row">
            <strong>Status:</strong> 
            <span className={`status-badge ${leave.status}`}>{leave.status}</span>
          </div>
          <div className="detail-row">
            <strong>Requested:</strong> {formatDateTime(leave.requestedAt)}
          </div>
        </div>
        
        <div className="modal-actions">
          {canApprove && leave.status === 'pending' && (
            <button 
              className="approve-btn"
              onClick={() => {
                onApprove(leave.id);
                onClose();
              }}
            >
              Approve
            </button>
          )}
          {canDelete && (
            <button 
              className="delete-btn"
              onClick={() => {
                onDelete(leave.id);
                onClose();
              }}
            >
              Delete
            </button>
          )}
          <button className="modal-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}