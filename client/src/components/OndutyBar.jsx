import React from 'react'
import dayjs from 'dayjs'

function rangeDays(month){
  const start = month.startOf('month');
  const days = month.daysInMonth();
  return Array.from({length:days},(_,i)=> start.add(i,'day'));
}

export default function OndutyBar({members,leaves,month}) {
  const days = rangeDays(month);
  const total = members.length || 1;
  
  return (
    <div className="onduty-badges" style={{gridTemplateColumns: `120px repeat(${days.length}, 1fr)`}}>
      <div className="duty-label">On Duty %</div>
      {days.map(d => {
        const onLeave = leaves.filter(l => l.date === d.format('YYYY-MM-DD')).length;
        const onDuty = total - onLeave;
        const pct = Math.round((onDuty / total) * 100);
        const badgeClass = pct < 70 ? 'duty-badge low' : 'duty-badge';
        return (
          <div
            key={d.toString()}
            className={badgeClass}
            title={`${pct}% on duty (${onDuty}/${total})`}
          />
        );
      })}
    </div>
  );
}