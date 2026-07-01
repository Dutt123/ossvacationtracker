import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function HolidaysModal({ isOpen, onClose, holidays }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="modal wide" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Public Holidays</h2>
              <button className="icon-btn" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="holiday-list">
                {holidays.map((h, i) => {
                  const isFixed = h.description.includes('(Fixed)');
                  return (
                    <div key={i} className="holiday-row">
                      <span className="holiday-date">{h.date}</span>
                      <span className="holiday-desc">{h.description.replace(' (Fixed)', '').replace(' (Optional)', '')}</span>
                      <span className={`holiday-badge ${isFixed ? 'fixed' : 'optional'}`}>{isFixed ? 'Fixed' : 'Optional'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
