import React, { useState, useEffect } from 'react';
import { X, Calendar, User, CalendarDays } from 'lucide-react';

export default function LeaveRequestModal({ isOpen, onClose, onSubmit, members, categories, categoryNames, selectedDate, selectedMember: preSelectedMember }) {
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setSelectedMember(preSelectedMember || '');
      setStartDate(selectedDate || '');
      setEndDate(selectedDate || '');
      setSelectedCategory('');
    }
  }, [isOpen, preSelectedMember, selectedDate]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    console.log('Submitting leave request');
    if (!selectedMember || !selectedCategory || !startDate || !endDate) return;
    console.log('All fields valid, proceeding with submission');
    setIsSubmitting(true);
    try {
      const dates = [];
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      for (let ms = startMs; ms <= endMs; ms += dayMs) {
        const date = new Date(ms);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      }
      console.log('Dates to submit:', dates);

      if (dates.length === 1) {
        // Single day — use existing per-day endpoint
        await onSubmit(selectedMember, dates[0], selectedCategory);
      } else {
        // Multi day — use batch endpoint (single notification)
        const res = await fetch('/api/leaves/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member: selectedMember,
            dates,
            category: selectedCategory,
            isAdmin: false
          })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Batch submit failed');
        }
        // Refresh data via parent
        await onSubmit(null, null, null, true);
      }

      setSelectedMember('');
      setSelectedCategory('');
      setStartDate('');
      setEndDate('');
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
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="request-info">
            <p>Requesting leave for: <strong>{selectedMember}</strong></p>
          </div>
          
          <div className="form-section">
            <label>
              <CalendarDays size={16} />
              Date Range
            </label>
            <div className="date-range">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
                placeholder="Start Date"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="date-input"
                placeholder="End Date"
              />
            </div>

          </div>

          <div className="form-section">
            <label>Leave Type</label>
            <div className="leave-options">
              {Object.entries(categories).map(([code, color]) => {
                const isWcoBlocked = code === 'WCO' && startDate && new Date(startDate).getDay() !== 1;
                return (
                  <button
                    key={code}
                    className={`leave-option ${selectedCategory === code ? 'selected' : ''}`}
                    style={{ 
                      backgroundColor: selectedCategory === code ? color : 'transparent',
                      borderColor: isWcoBlocked ? '#4b5563' : color,
                      opacity: isWcoBlocked ? 0.5 : 1,
                      cursor: isWcoBlocked ? 'not-allowed' : 'pointer'
                    }}
                    title={isWcoBlocked ? 'WCO can only be applied on Mondays. Please reach out to Admin.' : ''}
                    onClick={() => {
                      if (isWcoBlocked) {
                        alert('WCO can only be applied on Mondays. Please reach out to Admin.');
                        return;
                      }
                      setSelectedCategory(code);
                    }}
                  >
                    <div className="leave-code">{code}</div>
                    <div className="leave-name">{categoryNames[code]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-actions">
            <button 
              className="submit-btn" 
              onClick={handleSubmit}
              disabled={!selectedMember || !selectedCategory || !startDate || !endDate || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}