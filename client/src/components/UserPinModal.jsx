import React, { useState } from 'react';

export default function UserPinModal({ isOpen, onClose, onSuccess, members }) {
  const [selectedMember, setSelectedMember] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember || !pin) {
      setError('Please select a member and enter PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/validate-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member: selectedMember, pin })
      });
      
      const result = await response.json();
      
      if (result.valid) {
        onSuccess(selectedMember);
        onClose();
        setSelectedMember('');
        setPin('');
      } else {
        setError('Invalid PIN');
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedMember('');
    setPin('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>User Authentication</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Your Name:</label>
            <select 
              value={selectedMember} 
              onChange={(e) => setSelectedMember(e.target.value)}
              required
            >
              <option value="">Choose...</option>
              {members.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Enter Your PIN:</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4-digit PIN"
              maxLength="4"
              required
            />
          </div>
          
          {error && <div className="error">{error}</div>}
          
          <div className="modal-actions">
            <button type="button" onClick={handleClose}>Cancel</button>
            <button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}