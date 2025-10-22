import React, { useState, useEffect } from 'react';
import { X, Clock, CalendarDays, User } from 'lucide-react';

export default function ShiftUpdateModal({
  isOpen,
  onClose,
  onSubmit,
  selectedMember: preSelectedMember
}) {
  const [selectedMember, setSelectedMember] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedShift, setSelectedShift] = useState('IST');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedMember(preSelectedMember || '');
      setStartDate('');
      setEndDate('');
      setSelectedShift('IST');
    }
  }, [isOpen, preSelectedMember]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedMember || !startDate || !endDate || !selectedShift) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        member: selectedMember,
        startDate,
        endDate,
        shift: selectedShift
      });
      setStartDate('');
      setEndDate('');
      setSelectedShift('IST');
      onClose();
    } catch (err) {
      console.log(err);
      alert('Error updating shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="request-modal">
        <div className="modal-header">
          <div className="modal-title">
            <Clock size={22} />
            <h2>Update Shift</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="request-info">
            <p>Updating shift for: <strong>{selectedMember}</strong></p>
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
            <label>
              <User size={16} />
              Select Shift
            </label>
            <div className="shift-options">
              {['APAC', 'IST', 'EMEA'].map((shift) => (
                <button
                  key={shift}
                  className={`shift-option ${selectedShift === shift ? 'selected' : ''}`}
                  onClick={() => setSelectedShift(shift)}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button 
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!startDate || !endDate || isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Shift'}
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
