import React, { useState } from 'react';
import { X } from 'lucide-react';

function parseHolidayType(description) {
  if (description.includes('(Fixed)')) return 'Fixed';
  if (description.includes('(Optional)')) return 'Optional';
  return 'Fixed';
}

function parseDateToISO(dateStr) {
  // Handles '26 Jan 2026' format safely without timezone issues
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildHolidayMap(holidays) {
  const map = {};
  holidays.forEach(h => {
    const date = parseDateToISO(h.date);
    map[date] = { description: h.description, type: parseHolidayType(h.description) };
  });
  return map;
}

export default function PHSummaryModal({ isOpen, onClose, members, leaves, holidays, year }) {
  const [expandedMember, setExpandedMember] = useState(null);

  if (!isOpen) return null;

  const holidayMap = buildHolidayMap(holidays);
  const periodStart = `${year}-07-01`;
  const periodEnd = `${parseInt(year) + 1}-06-30`;

  const summary = members.map(member => {
    const phLeaves = leaves.filter(l =>
      l.member === member &&
      l.category === 'PH' &&
      l.date >= periodStart &&
      l.date <= periodEnd
    );

    const fixed = phLeaves.filter(l => holidayMap[l.date]?.type === 'Fixed');
    const optional = phLeaves.filter(l => holidayMap[l.date]?.type === 'Optional');
    const unknown = phLeaves.filter(l => !holidayMap[l.date]);

    return { member, fixed, optional, unknown, total: phLeaves.length };
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content2 ph-summary-modal" onClick={e => e.stopPropagation()}>
        <div className="ph-summary-header">
          <h2>Public Holiday Usage — Jul {year} to Jun {parseInt(year) + 1}</h2>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <table className="holiday-table ph-summary-table">
          <thead>
            <tr>
              <th>Engineer</th>
              <th>Fixed</th>
              <th>Optional</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(({ member, fixed, optional, unknown, total }) => (
              <React.Fragment key={member}>
                <tr
                  className={`ph-summary-row ${expandedMember === member ? 'expanded' : ''}`}
                  onClick={() => setExpandedMember(expandedMember === member ? null : member)}
                  title="Click to expand"
                >
                  <td>{member}</td>
                  <td>{fixed.length}</td>
                  <td>{optional.length}</td>
                  <td>{total}</td>
                </tr>
                {expandedMember === member && total > 0 && (
                  <tr className="ph-detail-row">
                    <td colSpan={4}>
                      <div className="ph-detail-list">
                        {[...fixed, ...optional, ...unknown].map(l => {
                          const info = holidayMap[l.date];
                          return (
                            <div key={l.date} className="ph-detail-item">
                              <span className={`ph-type-badge ${info ? info.type.toLowerCase() : 'unknown'}`}>
                                {info ? info.type : '?'}
                              </span>
                              <span className="ph-detail-date">{l.date}</span>
                              <span className="ph-detail-name">
                                {info ? info.description.replace(' (Fixed)', '').replace(' (Optional)', '') : 'Unknown holiday'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <button className="close-btn2" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
