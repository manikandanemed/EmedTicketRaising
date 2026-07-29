import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Briefcase,
  ArrowRight
} from 'lucide-react';
import { api, EmployeeDashboardResponseDto } from '../services/api';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summary, setSummary] = useState<EmployeeDashboardResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployeeDashboard();
      if (res.success) {
        setSummary(res.data);
        setError('');
        setLastUpdatedAt(new Date());
      } else {
        setError(res.message || 'Failed to fetch dashboard summary');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);

  if (loading && !summary) {
    return (
      <div className="loading-center">
        <Loader2 className="spinner" size={28} color="var(--primary)" />
        <span>Loading your dashboard...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start', borderColor: 'rgba(239,68,68,0.25)' }}>
        <AlertTriangle size={24} color="var(--danger)" />
        <div>
          <h3 style={{ color: 'var(--danger)', marginBottom: '4px' }}>Error loading Dashboard</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error || 'No data returned.'}</p>
          <button className="btn btn-secondary" onClick={fetchSummary} style={{ marginTop: '12px' }}>
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  const { totalAssigned, totalProjects, statusCounts, assignedProjects } = summary;

  // Same validated categorical palette used on the admin Dashboard's Status
  // Counts panel, so the two dashboards read as one consistent system.
  const statusCards = [
    { label: 'Assigned',       value: statusCounts.assigned,      color: '#1baf7a' },
    { label: 'Closed',         value: statusCounts.closed,        color: '#94a3b8' },
    { label: 'Completed',      value: statusCounts.completed,     color: '#008300' },
    { label: 'Fixed',          value: statusCounts.fixed,         color: '#eda100' },
    { label: 'Future Release', value: statusCounts.futureRelease, color: '#4a3aa7' },
    { label: 'In Progress',    value: statusCounts.inProgress,    color: '#eb6834' },
    { label: 'Open',           value: statusCounts.open,          color: '#e34948' },
    { label: 'Reopen',         value: statusCounts.reopen,        color: '#e87ba4' },
    { label: 'To Do',          value: statusCounts.todo,          color: '#2a78d6' },
  ];

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.name}. Here's your work at a glance.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {lastUpdatedAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <Clock size={13} />
              Updated {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn btn-secondary" onClick={fetchSummary} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/my-works')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            My Works
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Status Counts */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px' }}>
        <div className="section-header" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div className="section-title">
            <BarChart3 size={18} color="var(--primary-hover)" />
            Status Counts
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalAssigned} total assigned</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          {statusCards.map(s => (
            <div
              key={s.label}
              className="glass-panel"
              style={{ padding: '16px 18px', borderLeft: `4px solid ${s.color}`, boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Projects */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div className="section-header" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div className="section-title">
            <Briefcase size={18} color="var(--secondary)" />
            My Projects
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalProjects} projects</span>
        </div>

        {assignedProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Briefcase size={28} /></div>
            <h3>No projects assigned yet.</h3>
            <p>Projects you're assigned to will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {assignedProjects.map(p => (
              <span
                key={p.projectId}
                className="badge badge-assigned"
                style={{ fontSize: '0.85rem', padding: '8px 14px' }}
              >
                {p.projectName}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
