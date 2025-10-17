import React, { useState } from 'react';
import { Users, LogIn } from 'lucide-react';

export default function LoginScreen({ members, onLogin }) {
  const [selectedMember, setSelectedMember] = useState('');

  const handleLogin = () => {
    if (selectedMember) {
      onLogin(selectedMember);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <Users size={48} />
          <h1>Vacation Tracker</h1>
          <p>Select your name to continue</p>
        </div>
        
        <div className="login-form">
          <select 
            value={selectedMember} 
            onChange={(e) => setSelectedMember(e.target.value)}
            className="member-select"
          >
            <option value="">Choose your name...</option>
            {members.map((member, index) => (
              <option key={index} value={member}>{member}</option>
            ))}
          </select>
          
          <button 
            onClick={handleLogin} 
            disabled={!selectedMember}
            className="login-btn"
          >
            <LogIn size={20} />
            Login
          </button>
        </div>
      </div>
    </div>
  );
}