import React, { useState } from 'react'
import dayjs from 'dayjs'
import LeaveModal from './LeaveModal'
import LeaveRequestModal from './LeaveRequestModal'
import LeaveDetailsModal from './LeaveDetailsModal'

function rangeDays(month){
  const start = month.startOf('month');
  const days = month.daysInMonth();
  return Array.from({length:days},(_,i)=> start.add(i,'day'));
}

export default function Calendar({members,leaves,month,categories,categoryNames,onAdd,onDel,onApprove,currentUser,isAdmin}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const days = rangeDays(month);
  function leavesFor(member, day) {
    return leaves.filter(l => l.member === member && l.date === day.format('YYYY-MM-DD'));
  }
  
  function canAddLeave(member) {
    return true; // Anyone can request leaves
  }
  
  function canDeleteLeave(leave) {
    return isAdmin; // Only admins can delete leaves in public view
  }
  
  function getOnDutyPercentage(day) {
    const onLeave = leaves.filter(l => l.date === day.format('YYYY-MM-DD') && l.status === 'approved').length;
    const onDuty = members.length - onLeave;
    return Math.round((onDuty / (members.length || 1)) * 100);
  }
  
  function getOnDutyColorClass(percentage) {
    if (percentage < 50) return 'critical';
    if (percentage < 60) return 'low-staffing';
    if (percentage < 70) return 'warning';
    return 'good';
  }
  
  return (
    <div className="calendar">
      <div className="calendar-grid" style={{gridTemplateColumns: `140px repeat(${days.length}, 1fr)`}}>
        {/* Header Row */}
        <div className="header-empty">Team Member</div>
        {days.map(d => {
          const isSunday = d.day() === 0;
          const isSaturday = d.day() === 6;
          const isWeekend = isSunday || isSaturday;
          const percentage = getOnDutyPercentage(d);
          const isLowStaffing = percentage < 60;
          return (
            <div key={d.format('D')} className={`date-header ${isWeekend ? 'weekend-header' : ''} ${isLowStaffing ? 'low-staffing-header' : ''}`}>
              <div>{d.format('D')}</div>
              <div style={{ fontSize: '9px', color: 'var(--muted)' }}>{d.format('ddd')}</div>
              {isLowStaffing && <div className="staffing-warning">⚠️</div>}
            </div>
          );
        })}
        
        {/* On Duty Row */}
        <div className="on-duty-row-label">On Duty</div>
        {days.map(d => {
          const percentage = getOnDutyPercentage(d);
          const isSunday = d.day() === 0;
          const isSaturday = d.day() === 6;
          const isWeekend = isSunday || isSaturday;
          const isLowStaffing = percentage < 60;
          return (
            <div key={`onduty-${d.format('D')}`} className={`on-duty-cell ${getOnDutyColorClass(percentage)} ${isWeekend ? 'weekend-cell' : ''} ${isLowStaffing ? 'low-staffing-cell' : ''}`}>
              {percentage}%
            </div>
          );
        })}
        
        {/* Member Rows */}
        {members.map(m => (
          <React.Fragment key={m}>
            <div className="member-name" title={m}>{m}</div>
            {days.map(d => {
              const l = leavesFor(m, d);
              const percentage = getOnDutyPercentage(d);
              const columnClass = getOnDutyColorClass(percentage);
              const isSunday = d.day() === 0;
              const isSaturday = d.day() === 6;
              const isWeekend = isSunday || isSaturday;
              const isLowStaffing = percentage < 60;
              
              if (l.length > 0) {
                const leave = l[0];
                const cat = leave.category;
                const isPending = leave.status === 'pending';
                return (
                  <div key={d.toString()} className={`day-cell has-leave column-${columnClass} ${isWeekend ? 'weekend-cell' : ''} ${isLowStaffing ? 'low-staffing-cell' : ''}`}>
                    <div
                      className={`leave-pill ${isPending ? 'pending' : ''}`}
                      style={{ background: categories[cat] || 'var(--pill-bg)' }}
                      title={`${cat} ${isPending ? '(Pending)' : ''}${leave.requestedAt ? `\nRequested: ${new Date(leave.requestedAt).toLocaleDateString()} ${new Date(leave.requestedAt).toLocaleTimeString()}` : ''} - Click for details`}
                      onClick={() => {
                        setSelectedLeave(leave);
                        setDetailsModalOpen(true);
                      }}
                    >
                      {cat}
                    </div>
                    {isPending && isAdmin && (
                      <button 
                        className="approve-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApprove(leave.id);
                        }}
                        title="Approve leave"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                );
              }
              return (
                <div
                  key={d.toString()}
                  className={`day-cell column-${columnClass} ${isWeekend ? 'weekend-cell' : ''} ${isLowStaffing ? 'low-staffing-cell' : ''}`}
                  title={isWeekend ? `${d.format('dddd')} - Weekend` : isLowStaffing ? `Low staffing (${percentage}%) - ${isAdmin ? 'Click to add leave' : 'Admin access required'}` : isAdmin ? "Click to add leave" : "Admin access required"}
                  onClick={() => {
                    if (isWeekend) return;
                    const dateStr = d.format('YYYY-MM-DD');
                    if (isAdmin) {
                      setSelectedCell({ member: m, date: dateStr });
                      setModalOpen(true);
                    } else {
                      setSelectedCell({ member: m, date: dateStr });
                      setRequestModalOpen(true);
                    }
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      
      <LeaveModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(category) => {
          if (selectedCell) {
            onAdd(selectedCell.member, selectedCell.date, category);
          }
        }}
        categories={categories}
        categoryNames={categoryNames}
      />
      
      <LeaveRequestModal 
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSubmit={onAdd}
        members={members}
        categories={categories}
        categoryNames={categoryNames}
        selectedDate={selectedCell?.date}
        selectedMember={selectedCell?.member}
      />
      
      <LeaveDetailsModal 
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        leave={selectedLeave}
        categoryNames={categoryNames}
        onDelete={onDel}
        onApprove={onApprove}
        canDelete={canDeleteLeave(selectedLeave)}
        canApprove={isAdmin && selectedLeave?.status === 'pending'}
      />
    </div>
  );
}