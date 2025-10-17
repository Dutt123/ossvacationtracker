import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Power, Pause, Play, RotateCcw } from 'lucide-react';

const defaultServers = [
  {
    id: "1",
    number: "01",
    serviceName: "VPS-2 (Windows)",
    osType: "windows",
    serviceLocation: "Frankfurt, Germany",
    countryCode: "de",
    ip: "198.51.100.211",
    dueDate: "14 Oct 2027",
    cpuPercentage: 80,
    status: "active"
  },
  {
    id: "2", 
    number: "02",
    serviceName: "VPS-1 (Windows)",
    osType: "windows",
    serviceLocation: "Frankfurt, Germany", 
    countryCode: "de",
    ip: "203.0.113.158",
    dueDate: "14 Oct 2027",
    cpuPercentage: 90,
    status: "active"
  },
  {
    id: "3",
    number: "03", 
    serviceName: "VPS-1 (Ubuntu)",
    osType: "ubuntu",
    serviceLocation: "Paris, France",
    countryCode: "fr",
    ip: "192.0.2.37",
    dueDate: "27 Jun 2027",
    cpuPercentage: 50,
    status: "paused"
  }
];

export function ServerManagementTable({
  title = "Active Services",
  servers: initialServers = defaultServers,
  onStatusChange,
  className = ""
}) {
  const [servers, setServers] = useState(initialServers);
  const [selectedServer, setSelectedServer] = useState(null);

  const handleStatusChange = (serverId, newStatus) => {
    if (onStatusChange) {
      onStatusChange(serverId, newStatus);
    }
    setServers(prev => prev.map(server => 
      server.id === serverId ? { ...server, status: newStatus } : server
    ));
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: { bg: '#10b981', text: '#ffffff' },
      paused: { bg: '#f59e0b', text: '#ffffff' },
      inactive: { bg: '#ef4444', text: '#ffffff' }
    };
    const style = styles[status] || styles.active;
    
    return (
      <div style={{
        padding: '6px 12px',
        borderRadius: '8px',
        backgroundColor: style.bg,
        color: style.text,
        fontSize: '12px',
        fontWeight: '600',
        textAlign: 'center'
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  const getCPUBars = (percentage) => {
    const filledBars = Math.round((percentage / 100) * 10);
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '2px' }}>
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              style={{
                width: '6px',
                height: '20px',
                borderRadius: '3px',
                backgroundColor: index < filledBars ? '#10b981' : '#e5e7eb',
                transition: 'all 0.3s'
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '600' }}>
          {percentage}%
        </span>
      </div>
    );
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      background: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '20px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            animation: 'pulse 2s infinite'
          }} />
          <h1 style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            color: 'rgba(255, 255, 255, 0.95)',
            margin: 0,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}>
            {title}
          </h1>
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: 'rgba(255, 255, 255, 0.8)' 
        }}>
          {servers.filter(s => s.status === "active").length} Active • {servers.filter(s => s.status === "inactive").length} Inactive
        </div>
      </div>

      {/* Table Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 2fr 2fr 1.5fr 1.5fr 1.5fr 1fr',
        gap: '16px',
        padding: '12px 16px',
        fontSize: '12px',
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.7)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <div>No</div>
        <div>Service Name</div>
        <div>Location</div>
        <div>IP Address</div>
        <div>Due Date</div>
        <div>CPU Usage</div>
        <div>Status</div>
      </div>

      {/* Server Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {servers.map((server) => (
          <motion.div
            key={server.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 2fr 2fr 1.5fr 1.5fr 1.5fr 1fr',
              gap: '16px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            whileHover={{
              y: -2,
              backgroundColor: 'rgba(255, 255, 255, 0.15)'
            }}
            onClick={() => setSelectedServer(server)}
          >
            {/* Number */}
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '700', 
              color: 'rgba(255, 255, 255, 0.8)' 
            }}>
              {server.number}
            </div>

            {/* Service Name */}
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.95)', 
              fontWeight: '600' 
            }}>
              {server.serviceName}
            </div>

            {/* Location */}
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.9)' 
            }}>
              {server.serviceLocation}
            </div>

            {/* IP */}
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.9)' 
            }}>
              {server.ip}
            </div>

            {/* Due Date */}
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.9)' 
            }}>
              {server.dueDate}
            </div>

            {/* CPU */}
            <div>
              {getCPUBars(server.cpuPercentage)}
            </div>

            {/* Status */}
            <div>
              {getStatusBadge(server.status)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Server Management Modal */}
      <AnimatePresence>
        {selectedServer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 10
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: 'rgba(255, 255, 255, 0.8)' 
                }}>
                  {selectedServer.number}
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    color: 'rgba(255, 255, 255, 0.95)',
                    margin: 0
                  }}>
                    {selectedServer.serviceName}
                  </h3>
                  <div style={{ 
                    fontSize: '14px', 
                    color: 'rgba(255, 255, 255, 0.7)' 
                  }}>
                    {selectedServer.serviceLocation}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedServer.status === "active" ? (
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleStatusChange(selectedServer.id, "inactive")}
                  >
                    <Power size={14} />
                    Stop
                  </button>
                ) : (
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleStatusChange(selectedServer.id, "active")}
                  >
                    <Play size={14} />
                    Start
                  </button>
                )}

                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleStatusChange(selectedServer.id, selectedServer.status === "paused" ? "active" : "paused")}
                >
                  {selectedServer.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
                  {selectedServer.status === "paused" ? "Resume" : "Pause"}
                </button>

                <button
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}
                  onClick={() => setSelectedServer(null)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ 
              flex: 1, 
              padding: '20px', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '16px' 
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'uppercase',
                  marginBottom: '8px'
                }}>
                  IP Address
                </div>
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.95)'
                }}>
                  {selectedServer.ip}
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'uppercase',
                  marginBottom: '8px'
                }}>
                  CPU Usage
                </div>
                {getCPUBars(selectedServer.cpuPercentage)}
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'uppercase',
                  marginBottom: '8px'
                }}>
                  Status
                </div>
                {getStatusBadge(selectedServer.status)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}