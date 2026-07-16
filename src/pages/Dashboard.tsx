import React, { useEffect, useState } from 'react';
import { api, DashboardResponseDto, BugDto } from '../services/api';
import { toast } from '../services/toast';
import { useDebounce } from '../hooks/useDebounce';
import {
  Briefcase, CheckSquare, Bug, Users, Loader2,
  AlertTriangle, RefreshCw, ChevronDown, ChevronRight,
  TrendingUp, Activity, Search
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedEmployees, setExpandedEmployees] = useState<Record<number, boolean>>({});
  const [newNoteText, setNewNoteText] = useState<Record<number, string>>({});
  const [savingNote, setSavingNote] = useState<Record<number, boolean>>({});

  // Bugs Queue state (PM)
  const [pmBugs, setPmBugs] = useState<BugDto[]>([]);
  const [pmBugsTotalPages, setPmBugsTotalPages] = useState(1);
  const [pmBugsTotalCount, setPmBugsTotalCount] = useState(0);
  const [pmBugPage, setPmBugPage] = useState(1);
  const [pmBugStatus, setPmBugStatus] = useState('all');
  const [pmBugDate, setPmBugDate] = useState('');
  const [pmBugSearch, setPmBugSearch] = useState('');
  const [pmBugsLoading, setPmBugsLoading] = useState(false);
  const PM_BUG_PAGE_SIZE = 10;

  const handleNoteChange = (empId: number, text: string) => {
    setNewNoteText(prev => ({ ...prev, [empId]: text }));
  };

  const handleSaveNote = async (empId: number) => {
    const text = newNoteText[empId];
    if (!text || !text.trim()) return;
    setSavingNote(prev => ({ ...prev, [empId]: true }));
    try {
      const res = await api.addEmployeeNote(empId, text);
      if (res.success) {
        setNewNoteText(prev => ({ ...prev, [empId]: '' }));
        fetchDashboard();
        toast.success('Daily status note saved successfully!');
      } else {
        toast.error(res.message || 'Failed to save note');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving note');
    } finally {
      setSavingNote(prev => ({ ...prev, [empId]: false }));
    }
  };

  const toggleEmployee = (empId: number) => {
    setExpandedEmployees(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard();
      if (res.success) {
        setData(res.data);
        setError('');
      } else {
        setError(res.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  // Fetch all bugs for PM (paginated + filtered)
  const fetchPmBugs = async () => {
    setPmBugsLoading(true);
    try {
      const res = await api.getAllBugsPaged({
        page: pmBugPage,
        pageSize: PM_BUG_PAGE_SIZE,
        status: pmBugStatus !== 'all' ? pmBugStatus : undefined,
        date: pmBugDate || undefined,
        search: pmBugSearch || undefined,
      });
      if (res.success) {
        setPmBugs(res.data.items);
        setPmBugsTotalPages(res.data.totalPages);
        setPmBugsTotalCount(res.data.totalCount);
      }
    } catch (err: any) {
      console.error('Failed to fetch PM bugs:', err);
    } finally {
      setPmBugsLoading(false);
    }
  };

  // Debounce search text so we don't fire an API call on every keystroke
  const debouncedPmBugSearch = useDebounce(pmBugSearch, 400);

  // Reset page when PM bug filters change
  useEffect(() => { setPmBugPage(1); }, [pmBugStatus, pmBugDate, debouncedPmBugSearch]);

  // Re-fetch PM bugs when page/filters change
  const pmBugsFirstRender = React.useRef(true);
  useEffect(() => {
    if (pmBugsFirstRender.current) { pmBugsFirstRender.current = false; fetchPmBugs(); return; }
    fetchPmBugs();
  }, [pmBugPage, pmBugStatus, pmBugDate, debouncedPmBugSearch]);

  if (loading) {
    return (
      <div className="loading-center">
        <Loader2 className="spinner" size={28} color="var(--primary)" />
        <span>Loading dashboard metrics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel" style={{
        padding: '30px', display: 'flex', alignItems: 'center', gap: '14px',
        borderColor: 'rgba(239,68,68,0.25)'
      }}>
        <AlertTriangle size={24} color="var(--danger)" />
        <div>
          <h3 style={{ color: 'var(--danger)', marginBottom: '4px' }}>Error loading Dashboard</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error || 'No data returned.'}</p>
          <button className="btn btn-secondary" onClick={fetchDashboard} style={{ marginTop: '12px' }}>
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  const { workItemStatusCount, bugStatusCount, employeeWorkItemCounts } = data;
  const totalTasks = data.totalWorkItems;
  const totalBugs  = data.totalBugs;

  const kpiCards = [
    {
      label: 'Total Projects',
      value: data.totalProjects,
      icon: <Briefcase size={24} />,
      color: 'var(--primary)',
      glow: 'var(--primary-glow)',
      bg: 'rgba(14,165,233,0.15)',
      accent: 'hsla(243,75%,65%,0.12)',
    },
    {
      label: 'Work Items',
      value: totalTasks,
      icon: <CheckSquare size={24} />,
      color: 'var(--info)',
      glow: 'var(--info-glow)',
      bg: 'rgba(59,130,246,0.15)',
      accent: 'hsla(200,90%,60%,0.12)',
    },
    {
      label: 'Active Bugs',
      value: bugStatusCount.open + bugStatusCount.inProgress,
      icon: <Bug size={24} />,
      color: 'var(--danger)',
      glow: 'var(--danger-glow)',
      bg: 'rgba(239,68,68,0.15)',
      accent: 'hsla(350,85%,62%,0.12)',
    },
    {
      label: 'Active Employees',
      value: employeeWorkItemCounts.length,
      icon: <Users size={24} />,
      color: 'var(--success)',
      glow: 'var(--success-glow)',
      bg: 'rgba(52,211,153,0.15)',
      accent: 'hsla(158,64%,52%,0.12)',
    },
  ];

  const workStatuses = [
    { label: 'Pending',     count: workItemStatusCount.pending,    color: '#64748b', light: 'rgba(100,116,139,0.25)' },
    { label: 'In Progress', count: workItemStatusCount.inProgress, color: '#f59e0b', light: 'rgba(245,158,11,0.25)' },
    { label: 'Completed',   count: workItemStatusCount.completed,  color: '#34d399', light: 'rgba(52,211,153,0.25)' },
    { label: 'Testing',     count: workItemStatusCount.testing,    color: '#60a5fa', light: 'rgba(96,165,250,0.25)' },
    { label: 'Bug Found',   count: workItemStatusCount.bugFound,   color: '#f87171', light: 'rgba(248,113,113,0.25)' },
    { label: 'Closed',      count: workItemStatusCount.closed,     color: '#475569', light: 'rgba(71,85,105,0.25)' },
  ];

  const bugStatuses = [
    { label: 'Open',        count: bugStatusCount.open,       color: '#f87171', light: 'rgba(248,113,113,0.25)' },
    { label: 'In Progress', count: bugStatusCount.inProgress, color: '#f59e0b', light: 'rgba(245,158,11,0.25)' },
    { label: 'Fixed',       count: bugStatusCount.fixed,      color: '#34d399', light: 'rgba(52,211,153,0.25)' },
    { label: 'Closed',      count: bugStatusCount.closed,     color: '#475569', light: 'rgba(71,85,105,0.25)' },
  ];

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Project health, workloads and bug metrics.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchDashboard} style={{ gap: '8px' }}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '28px' }}>
        {kpiCards.map((card, i) => (
          <div
            key={card.label}
            className="glass-panel stat-card"
            style={{
              '--card-accent': card.accent,
              animationDelay: `${i * 0.08}s`
            } as React.CSSProperties}
          >
            <div className="stat-info">
              <h3>{card.label}</h3>
              <p style={{ color: card.color }}>{card.value}</p>
              <div className="stat-trend">
                <TrendingUp size={12} />
                <span>Active</span>
              </div>
            </div>
            <div className="stat-icon" style={{ background: card.bg, color: card.color, boxShadow: `0 0 20px ${card.glow}` }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Status Breakdowns */}
      <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Work Items */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div className="section-header" style={{ marginBottom: '22px' }}>
            <div className="section-title">
              <CheckSquare size={18} color="var(--primary-hover)" />
              Work Item Status Breakdown
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalTasks} total</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {workStatuses.map(s => {
              const pct = totalTasks > 0 ? (s.count / totalTasks) * 100 : 0;
              return (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '0.87rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ color: s.color, fontWeight: 700 }}>{s.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${s.color}aa, ${s.color})`,
                        boxShadow: `0 0 8px ${s.light}`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bug Statuses */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div className="section-header" style={{ marginBottom: '22px' }}>
            <div className="section-title">
              <Bug size={18} color="var(--danger)" />
              Bug Status Breakdown
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalBugs} total</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {bugStatuses.map(s => {
              const pct = totalBugs > 0 ? (s.count / totalBugs) * 100 : 0;
              return (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '0.87rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ color: s.color, fontWeight: 700 }}>{s.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${s.color}aa, ${s.color})`,
                        boxShadow: `0 0 8px ${s.light}`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Employee Workload Table */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <div className="section-title">
            <Activity size={18} color="var(--secondary)" />
            Employee Workloads &amp; Task Distribution
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {employeeWorkItemCounts.length} employees
          </span>
        </div>

        {employeeWorkItemCounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={28} /></div>
            <h3>No active employees registered yet.</h3>
            <p>Employees will appear here once they're added.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Total</th>
                  <th>To Do / Assigned / Reopen</th>
                  <th>In Progress</th>
                  <th>Resolved</th>
                  <th>Progress</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {employeeWorkItemCounts.map(emp => {
                  const compPct = emp.totalAssigned > 0 ? (emp.completed / emp.totalAssigned) * 100 : 0;
                  const isExpanded = !!expandedEmployees[emp.employeeId];
                  return (
                    <React.Fragment key={emp.employeeId}>
                      <tr
                        onClick={() => toggleEmployee(emp.employeeId)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary-dark), hsl(185,80%,40%))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                              border: '1px solid rgba(14,165,233,0.3)'
                            }}>
                              {emp.employeeName.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isExpanded
                                ? <ChevronDown size={14} color="var(--text-muted)" />
                                : <ChevronRight size={14} color="var(--text-muted)" />
                              }
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.employeeName}</span>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.totalAssigned}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{emp.pending}</td>
                        <td><span style={{ color: '#38bdf8', fontWeight: 600 }}>{emp.inProgress}</span></td>
                        <td><span style={{ color: '#4ade80', fontWeight: 600 }}>{emp.completed}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
                            <div className="progress-bar-track" style={{ flex: 1, height: '6px' }}>
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${compPct}%`,
                                  background: 'linear-gradient(90deg, var(--success), hsl(158,64%,70%))',
                                  boxShadow: '0 0 6px var(--success-glow)'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {compPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          {emp.latestNote ? (
                            <div>
                              <div style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', color: 'var(--text-secondary)', fontWeight: 500 }} title={emp.latestNote}>
                                {emp.latestNote}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {new Date(emp.latestNoteDate!).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-disabled)', fontSize: '0.82rem', fontStyle: 'italic' }}>No notes yet</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: '0', border: 'none' }}>
                            <div style={{
                              margin: '0 16px 16px',
                              display: 'grid',
                              gridTemplateColumns: '1.2fr 1fr',
                              gap: '16px',
                              background: 'rgba(14,165,233,0.04)',
                              borderRadius: 'var(--radius-md)',
                              padding: '20px',
                              border: '1px solid rgba(14,165,233,0.15)',
                              animation: 'fadeInUp 0.25s var(--ease-out) both'
                            }}>
                              {/* Assigned Tasks */}
                              <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <CheckSquare size={14} color="var(--primary-hover)" />
                                  Assigned Tasks ({emp.assignedTasks?.length || 0})
                                </h4>
                                {!emp.assignedTasks || emp.assignedTasks.length === 0 ? (
                                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active tasks assigned.</p>
                                ) : (
                                  <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                       <thead>
                                         <tr>
                                           {['Task #', 'Client', 'Project', 'Product', 'Module', 'Title', 'Status', 'Priority'].map(h => (
                                             <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-soft)' }}>{h}</th>
                                           ))}
                                         </tr>
                                       </thead>
                                       <tbody>
                                         {emp.assignedTasks.map(task => (
                                           <tr key={task.id}>
                                             <td style={{ padding: '8px 8px', fontWeight: 600 }}>
                                               <a href={`/projects/${task.projectId}`} style={{ color: 'var(--primary-hover)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                                                 {task.workNumber}
                                               </a>
                                             </td>
                                             <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                                               {task.clientName ? <span className="badge badge-assigned" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>{task.clientName}</span> : <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>-</span>}
                                             </td>
                                             <td style={{ padding: '8px 8px', color: 'var(--text-muted)', fontWeight: 500 }}>{task.projectName}</td>
                                             <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                                               {task.productName ? <span style={{ fontWeight: 500 }}>{task.productName}</span> : <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>-</span>}
                                             </td>
                                             <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                                               {task.moduleName ? <span style={{ color: '#c084fc', fontWeight: 500 }}>{task.moduleName}</span> : <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>-</span>}
                                             </td>
                                             <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{task.title}</td>
                                             <td style={{ padding: '8px 8px' }}>
                                               <span className={`badge badge-${task.status}`}>{formatStatus(task.status)}</span>
                                             </td>
                                             <td style={{ padding: '8px 8px' }}>
                                               <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                                             </td>
                                           </tr>
                                         ))}
                                       </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* Daily Status Diary */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Users size={14} color="var(--secondary)" />
                                  Daily Status Diary
                                </h4>
                                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <textarea
                                    placeholder="Type today's status update..."
                                    value={newNoteText[emp.employeeId] || ''}
                                    onChange={e => handleNoteChange(emp.employeeId, e.target.value)}
                                    className="form-textarea"
                                    style={{ minHeight: '60px', fontSize: '0.83rem' }}
                                  />
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => handleSaveNote(emp.employeeId)}
                                    disabled={savingNote[emp.employeeId] || !newNoteText[emp.employeeId]?.trim()}
                                    style={{ padding: '7px 14px', fontSize: '0.8rem', alignSelf: 'flex-end' }}
                                  >
                                    {savingNote[emp.employeeId] ? 'Saving...' : 'Save Note'}
                                  </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>History Log</span>
                                  {!emp.noteHistory || emp.noteHistory.length === 0 ? (
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No diary entries logged yet.</p>
                                  ) : (
                                    emp.noteHistory.map(note => (
                                      <div key={note.id} style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '10px', marginLeft: '4px', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{note.createdByName}</span>
                                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{new Date(note.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5, wordBreak: 'break-word' }}>{note.noteText}</p>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== PM BUGS QUEUE ====== */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '28px' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bug size={20} color="#f43f5e" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              All Bugs Queue
            </h3>
            <span style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', borderRadius: '999px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
              {pmBugsTotalCount}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search title or BUG-001..."
              value={pmBugSearch}
              onChange={(e) => setPmBugSearch(e.target.value)}
              style={{ paddingLeft: '12px', height: '36px', fontSize: '0.85rem' }}
            />
          </div>
          <select
            className="form-select"
            value={pmBugStatus}
            onChange={(e) => setPmBugStatus(e.target.value)}
            style={{ width: '155px', height: '36px', paddingTop: 0, paddingBottom: 0, paddingRight: '30px', paddingLeft: '12px', fontSize: '0.85rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="fixed">Fixed</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              className="form-input"
              value={pmBugDate}
              onChange={(e) => setPmBugDate(e.target.value)}
              style={{ width: '145px', height: '36px', cursor: 'pointer', padding: '0 8px', fontSize: '0.85rem' }}
            />
            {pmBugDate && (
              <button
                type="button"
                onClick={() => setPmBugDate('')}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
              >
                Clear
              </button>
            )}
          </div>
          {pmBugsLoading && <Loader2 size={16} className="spinner" style={{ color: 'var(--primary)' }} />}
        </div>

        {/* Bugs Table */}
        {pmBugs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {pmBugsLoading ? 'Loading...' : 'No bugs found matching your filters.'}
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bug ID</th>
                  <th>Title</th>
                  <th>Linked Task</th>
                  <th>Raised By</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Fixed On</th>
                </tr>
              </thead>
              <tbody>
                {pmBugs.map(bug => {
                  const statusColors: Record<string, { color: string; bg: string }> = {
                    open:        { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
                    in_progress: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                    fixed:       { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
                    resolved:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                    closed:      { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
                  };
                  const sc = statusColors[bug.status] || { color: 'var(--text-muted)', bg: 'transparent' };
                  return (
                    <tr key={bug.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem' }}>{bug.bugNumber}</td>
                      <td style={{ fontWeight: 600 }}>{bug.title}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{bug.workNumber || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{bug.raisedBy || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{bug.assignedTo || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                      <td>
                        <span style={{
                          background: sc.bg, color: sc.color,
                          borderRadius: '999px', padding: '3px 10px',
                          fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap'
                        }}>
                          {bug.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{new Date(bug.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ fontSize: '0.82rem' }}>{bug.fixedAt ? new Date(bug.fixedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bugs Pagination */}
        {pmBugsTotalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setPmBugPage(prev => Math.max(prev - 1, 1))}
              disabled={pmBugPage === 1}
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Page {pmBugPage} of {pmBugsTotalPages}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => setPmBugPage(prev => Math.min(prev + 1, pmBugsTotalPages))}
              disabled={pmBugPage === pmBugsTotalPages}
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const formatStatus = (status: string) => {
  if (!status) return '';
  switch (status.toLowerCase()) {
    case 'pending': return 'TO DO';
    case 'assigned': return 'ASSIGNED';
    case 'reopened': return 'REOPEN';
    case 'in_progress': return 'IN PROGRESS';
    case 'waiting_customer': return 'WAITING FOR CUSTOMER';
    case 'future_release': return 'MOVED TO FUTURE RELEASE';
    case 'completed': return 'RESOLVED';
    default: return status.toUpperCase().replace('_', ' ');
  }
};
