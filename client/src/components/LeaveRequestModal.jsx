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
    if (!selectedMember || !selectedCategory || !startDate || !endDate) return;
    
    setIsSubmitting(true);
    try {
      // Generate all dates between start and end
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Skip weekends
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          dates.push(d.toISOString().split('T')[0]);
        }
      }
      
      // Submit each date
      for (const date of dates) {
        await onSubmit(selectedMember, date, selectedCategory);
      }
      
      setSelectedMember('');
      setSelectedCategory('');
      setStartDate('');
      setEndDate('');
      onClose();
    } catch (err) {
      alert('Error submitting request');
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
            <div className="date-info">
              <small>Weekends will be automatically skipped</small>
            </div>
          </div>

          <div className="form-section">
            <label>Leave Type</label>
            <div className="leave-options">
              {Object.entries(categories).map(([code, color]) => (
                <button
                  key={code}
                  className={`leave-option ${selectedCategory === code ? 'selected' : ''}`}
                  style={{ 
                    backgroundColor: selectedCategory === code ? color : 'transparent',
                    borderColor: color 
                  }}
                  onClick={() => setSelectedCategory(code)}
                >
                  <div className="leave-code">{code}</div>
                  <div className="leave-name">{categoryNames[code]}</div>
                </button>
              ))}
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