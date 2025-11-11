import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import LeaveModal from './LeaveModal'
import LeaveRequestModal from './LeaveRequestModal'
import LeaveDetailsModal from './LeaveDetailsModal'
import ShiftUpdateModal from './ShiftUpdateModal';

function rangeDays(month){
  const start = month.startOf('month');
  const days = month.daysInMonth();
  return Array.from({length:days},(_,i)=> start.add(i,'day'));
}

const shiftColors = {
  "IST": "#fbbf24",   // vibrant amber
  "APAC": "#34d399",  // vibrant emerald
  "EMEA": "#60a5fa"   // vibrant blue
};

export default function Calendar({members,leaves,shifts, month,categories,categoryNames,onAdd,onDel,onApprove,currentUser,isAdmin, onUpdateShift, excludeFromOnDuty = []}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [memberList, setMemberList] = useState(members || []);
  const [sortState, setSortState] = useState({ day: null, asc: true });
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [selectedMemberForShift, setSelectedMemberForShift] = useState(null);
  const [hoveredMember, setHoveredMember] = useState(null);
  const days = rangeDays(month);

  useEffect(() => {
    if (Array.isArray(members)) {
      setMemberList([...members].sort());
    }
  }, [members]);

  function leavesFor(member, day) {
    return leaves.filter(l => l.member === member && l.date === day.format('YYYY-MM-DD'));
  }
  
  function canAddLeave(member) {
    return true; // Anyone can request leaves
  }
  
  function canDeleteLeave(leave) {
    if (!leave) return false;
    if (isAdmin) return true; // Admins can delete any leave
    return leave.status === 'pending'; // Regular users can only delete pending leaves
  }
  
  function getOnDutyPercentage(day) {
    const eligibleMembers = members.filter(member => !excludeFromOnDuty.includes(member));
    const onLeave = leaves.filter(l => l.date === day.format('YYYY-MM-DD') && l.status === 'approved' && eligibleMembers.includes(l.member)).length;
    const onDuty = eligibleMembers.length - onLeave;
    return Math.round((onDuty / (eligibleMembers.length || 1)) * 100);
  }
  
  function getOnDutyColorClass(percentage) {
    if (percentage < 50) return 'critical';
    if (percentage < 60) return 'low-staffing';
    if (percentage < 70) return 'warning';
    return 'good';
  }
  
  function getOrderNumberOfLeaveApplied(member, day) {
    const dayLeaves = leaves.filter(l => l.date === day.format('YYYY-MM-DD') && l.status !== 'approved');
    dayLeaves.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (let i = 0; i < dayLeaves.length; i++) {
      if (dayLeaves[i].member === member) {
        return i + 1;
      }
    }
    return null;
  }

  const handleSortByDay = (day) => {
    setSortState(prev => {
      const asc = prev.day === day.format('YYYY-MM-DD') ? !prev.asc : true;
      setMemberList(prev =>
        [...prev].sort((a, b) => {
          const noA = getOrderNumberOfLeaveApplied(a, day);
          const noB = getOrderNumberOfLeaveApplied(b, day);

          if (noA == null && noB == null) return 0;
          if (noA == null) return 1;
          if (noB == null) return -1;

          return asc ? noA - noB : noB - noA;
        })
      );
      return { day: day.format('YYYY-MM-DD'), asc };
    });
  };

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
              <span
                className="sort-arrow"
                style={{ transform: sortState.day === d.format('YYYY-MM-DD') && !sortState.asc ? 'rotate(180deg)' : 'none' }}
                onClick={() => handleSortByDay(d)}>
                ▲
              </span>
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
        {memberList.map(m => (
          <React.Fragment key={m}>
            <div className={`member-name ${hoveredMember === m ? 'row-highlighted' : ''}`} title={m}>
              <div>{m}</div>
              {isAdmin && (
                <button
                  className="update-shift-btn"
                  onClick={() => {
                    setSelectedMemberForShift(m)
                    setShiftModalOpen(true)
                  }}
                >
                  Update Shift
                </button>
              )}
            </div>
            {days.map(d => {
              const l = leavesFor(m, d);
              const percentage = getOnDutyPercentage(d);
              const columnClass = getOnDutyColorClass(percentage);
              const isSunday = d.day() === 0;
              const isSaturday = d.day() === 6;
              const isWeekend = isSunday || isSaturday;
              const isLowStaffing = percentage < 60;
              const orderNumberOfLeaveApplied = getOrderNumberOfLeaveApplied(m, d);
              const shift = shifts?.[m]?.[d.format('YYYY-MM-DD')];
              const shiftStyle = shift ? { backgroundColor: shiftColors[shift], opacity: 0.3 } : {};

              if (l.length > 0) {
                const leave = l[0];
                const cat = leave.category;
                const isPending = leave.status === 'pending';

                return (
                  <div key={d.toString()} className={`day-cell has-leave column-${columnClass} ${isWeekend ? 'weekend-cell' : ''} ${isLowStaffing ? 'low-staffing-cell' : ''} ${hoveredMember === m ? 'row-highlighted' : ''}`}>
                    <div
                      className={`leave-pill ${isPending ? 'pending' : ''}`}
                      style={{ background: categories[cat] || 'var(--pill-bg)' }}
                      title={`${shift ? `${shift} Shift - ` : ''} ${cat} ${isPending ? '(Pending)' : ''}${leave.requestedAt ? `\nRequested: ${new Date(leave.requestedAt).toLocaleDateString()} ${new Date(leave.requestedAt).toLocaleTimeString()}` : ''} - Click for details`}
                      onClick={() => {
                        setSelectedLeave(leave);
                        setDetailsModalOpen(true);
                      }}
                    >
                      {cat}
                    </div>
                    {orderNumberOfLeaveApplied && (
                      <div className="number-badge">{orderNumberOfLeaveApplied}</div>
                    )}
                    {(isPending || isAdmin) && (
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening details modal
                          const confirmed = window.confirm("Are you sure you want to delete this leave?");
                          if (confirmed) {
                            onDel(leave.id); // Call your function
                          }
                        }}>
                        ×
                      </button>
                    )}
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
                    className={`day-cell column-${columnClass} ${isWeekend ? 'weekend-cell' : ''} ${isLowStaffing ? 'low-staffing-cell' : ''} ${hoveredMember === m ? 'row-highlighted' : ''}`}
                    title={
                      shift ? `${shift} shift` : isWeekend ? `${d.format('dddd')} - Weekend (Click to apply Weekend Shift)` :
                      isLowStaffing ? `Low staffing (${percentage}%) - ${isAdmin ? 'Click to add leave' : 'Admin access required'}` :
                      isAdmin ? "Click to add leave" : "Admin access required"
                    }
                    style={{
                      ...shiftStyle,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: shift ? '#1f2937' : 'inherit',
                      textShadow: shift ? '0 0 2px rgba(255,255,255,0.8)' : 'none',
                    }}
                    onMouseEnter={() => setHoveredMember(m)}
                    onMouseLeave={() => setHoveredMember(null)}
                    onClick={() => {
                      const dateStr = d.format('YYYY-MM-DD');
                      if (isAdmin) {
                        setSelectedCell({ member: m, date: dateStr });
                        setModalOpen(true);
                      } else {
                        setSelectedCell({ member: m, date: dateStr });
                        setRequestModalOpen(true);
                      }
                    }}
                  >
                        {shift && <span style={{ zIndex: 1 }}>{shift}</span>}
                  </div>
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

      <ShiftUpdateModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        selectedMember={selectedMemberForShift}
        onSubmit={(startDate, endDate, shift) => {
          onUpdateShift(selectedCell?.member, startDate, endDate, shift);
          setShiftModalOpen(false);
        }}
      />
    </div>
  );
}