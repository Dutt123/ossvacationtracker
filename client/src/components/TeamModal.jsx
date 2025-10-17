import React, { useState } from 'react';
import { X, UserPlus, Trash2, Users, Edit2, Check, X as XIcon } from 'lucide-react';

export default function TeamModal({ isOpen, onClose, members, onAddMember, onRemoveMember, onEditMember }) {
  const [newMemberName, setNewMemberName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      setError('Please enter a name');
      return;
    }
    
    setIsAdding(true);
    setError('');
    
    try {
      await onAddMember(newMemberName.trim());
      setNewMemberName('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberName) => {
    if (window.confirm(`Remove ${memberName} from the team?\n\nThis will also delete all their leave records permanently.`)) {
      try {
        await onRemoveMember(memberName);
      } catch (err) {
        alert(err.response?.data?.error || 'Error removing member');
      }
    }
  };

  const handleEditMember = (memberName) => {
    setEditingMember(memberName);
    setEditName(memberName);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      setError('Please enter a name');
      return;
    }
    
    try {
      await onEditMember(editingMember, editName.trim());
      setEditingMember(null);
      setEditName('');
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating member');
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditName('');
    setError('');
  };

  return (
    <div className="modal-overlay">
      <div className="team-modal">
        <div className="modal-header">
          <div className="modal-title">
            <Users size={24} />
            <h2>Team Management</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="add-member-section">
            <h3>Add New Member</h3>
            <div className="add-member-form">
              <input
                type="text"
                placeholder="Enter team member name..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                className="member-input"
              />
              <button 
                onClick={handleAddMember} 
                disabled={isAdding}
                className="add-btn"
              >
                <UserPlus size={16} />
                {isAdding ? 'Adding...' : 'Add'}
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="members-section">
            <h3>Current Team ({members.length} members)</h3>
            <div className="members-list">
              {members.map((member, index) => {
                const isEditing = editingMember === member;
                return (
                  <div key={index} className="member-item">
                    <div className="member-info">
                      <div className="member-avatar">
                        {member.charAt(0).toUpperCase()}
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          className="edit-input"
                          autoFocus
                        />
                      ) : (
                        <span className="member-name">{member}</span>
                      )}
                    </div>
                    <div className="member-actions">
                      {isEditing ? (
                        <>
                          <button 
                            onClick={handleSaveEdit}
                            className="save-btn"
                            title="Save changes"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="cancel-btn"
                            title="Cancel edit"
                          >
                            <XIcon size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEditMember(member)}
                            className="edit-btn"
                            title="Edit member name"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleRemoveMember(member)}
                            className="remove-btn"
                            title="Remove member"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}