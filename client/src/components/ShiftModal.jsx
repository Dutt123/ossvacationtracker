import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function ShiftModal({ isOpen, onClose, onSubmit, selectedMember }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shift, setShift] = useState('IST');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) { setStartDate(''); setEndDate(''); setShift('IST'); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!startDate || !endDate) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ member: selectedMember, startDate, endDate, shift });
      onClose();
    } catch { alert('Error updating shift'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Update Shift — {selectedMember}</h2>
              <button className="icon-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Date Range</label>
                <div className="date-range-row">
                  <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <span className="separator">to</span>
                  <input type="date" className="form-input" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Shift</label>
                <div className="shift-options">
                  {['APAC', 'IST', 'EMEA'].map(s => (
                    <button key={s} className={`shift-option-btn${shift === s ? ' selected' : ''}`} onClick={() => setShift(s)}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="action-btn" onClick={onClose}>Cancel</button>
              <button className="action-btn primary" onClick={handleSubmit} disabled={!startDate || !endDate || isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
