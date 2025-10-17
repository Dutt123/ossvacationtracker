import React, { useState, useEffect, useRef } from 'react';
import { X, Lock } from 'lucide-react';

export default function PinModal({ isOpen, onClose, onSuccess }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError('');
      // Focus first input when modal opens
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleInputChange = (index, value) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check PIN when all 4 digits entered
    if (newPin.every(digit => digit !== '') && index === 3) {
      const enteredPin = newPin.join('');
      if (enteredPin === '2024') {
        onSuccess();
        onClose();
      } else {
        setError('Invalid PIN');
        // Clear PIN after error
        setTimeout(() => {
          setPin(['', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 1000);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="pin-modal">
        <div className="pin-header">
          <Lock size={32} />
          <h2>Admin Access</h2>
          <p>Enter 4-digit PIN</p>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="pin-inputs">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="1"
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`pin-input ${error ? 'error' : ''}`}
            />
          ))}
        </div>

        {error && <div className="pin-error">{error}</div>}
        
        <div className="pin-hint">
          <span>Hint: Year of this app 🗓️</span>
        </div>
      </div>
    </div>
  );
}