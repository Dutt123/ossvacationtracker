import React, { useState } from 'react';

export default function PinValidationModal({ isOpen, onClose, onSuccess, member }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/validate-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member, pin })
      });
      
      const result = await response.json();
      
      if (result.valid) {
        onSuccess();
        handleClose();
      } else {
        setError('Invalid PIN for ' + member);
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>PIN Verification</h2>
        <p>Enter PIN for <strong>{member}</strong> to apply leave:</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 4-digit PIN"
              maxLength="4"
              autoFocus
              required
            />
          </div>
          
          {error && <div className="error">{error}</div>}
          
          <div className="modal-actions">
            <button type="button" onClick={handleClose}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}