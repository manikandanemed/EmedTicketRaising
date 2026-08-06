import React, { useEffect, useState } from 'react';
import { api, WorkItemDto, AdminDashboardResponseDto, ProjectDto, EmployeeDropdownDto } from '../services/api';
import {
  Briefcase, CheckSquare, Bug, Users, Loader2,
  AlertTriangle, RefreshCw, ChevronRight, ChevronLeft,
  ChevronsLeft, ChevronsRight,
  Filter, X, BarChart3, Clock
} from 'lucide-react';

// A single-ratio gauge (share of one whole) — deliberately not a 2-slice pie.
// The track is a lighter step of the same ramp as the fill so "how full" reads
// at a glance even before the number registers.
function RadialMeter({
  percent, size = 148, strokeWidth = 14, color, trackColor, sublabel,
}: {
  percent: number; size?: number; strokeWidth?: number; color: string; trackColor: string; sublabel?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{Math.round(clamped)}%</span>
        {sublabel && (
          <span style={{ fontSize: Math.max(10, size * 0.08), color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Filterable admin summary (projects/employees/date range) — the only
  // dashboard data source for this page; the legacy /api/dashboard is not used.
  const [adminData, setAdminData] = useState<AdminDashboardResponseDto | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState('');
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [employeesList, setEmployeesList] = useState<EmployeeDropdownDto[]>([]);
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  // Work Items table state (admin) — All / Open / Closed tabs
  const [workItemsTab, setWorkItemsTab] = useState<'all' | 'open' | 'closed'>('all');
  const [adminWorkItems, setAdminWorkItems] = useState<WorkItemDto[]>([]);
  const [adminWorkItemsTotalPages, setAdminWorkItemsTotalPages] = useState(1);
  const [adminWorkItemsTotalCount, setAdminWorkItemsTotalCount] = useState(0);
  const [adminWorkItemsPage, setAdminWorkItemsPage] = useState(1);
  const [adminWorkItemsLoading, setAdminWorkItemsLoading] = useState(false);
  const ADMIN_WORKITEMS_PAGE_SIZE = 10;

  // Fetch admin dashboard summary (KPIs, status counts, employee breakdown)
  const fetchAdminDashboard = async () => {
    setAdminLoading(true);
    try {
      const res = await api.getAdminDashboard({
        projectId: filterProjectId ? Number(filterProjectId) : undefined,
        employeeId: filterEmployeeId ? Number(filterEmployeeId) : undefined,
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
      });
      if (res.success) {
        setAdminData(res.data);
        setAdminError('');
        setLastUpdatedAt(new Date());
      } else {
        setAdminError(res.message || 'Failed to fetch admin dashboard data');
      }
    } catch (err: any) {
      setAdminError(err.message || 'Failed to connect to API server');
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => { fetchAdminDashboard(); }, [filterProjectId, filterEmployeeId, filterFromDate, filterToDate]);

  // Load filter dropdown options once
  useEffect(() => {
    api.getAllProjects().then(res => { if (res.success) setProjects(res.data); }).catch(() => {});
    api.getEmployeesDropdown().then(res => { if (res.success) setEmployeesList(res.data); }).catch(() => {});
  }, []);

  const clearFilters = () => {
    setFilterProjectId('');
    setFilterEmployeeId('');
    setFilterFromDate('');
    setFilterToDate('');
  };

  const hasActiveFilters = !!(filterProjectId || filterEmployeeId || filterFromDate || filterToDate);

  // Fetch admin work items (paginated, tab-filtered)
  const fetchAdminWorkItems = async () => {
    setAdminWorkItemsLoading(true);
    try {
      const res = await api.getAdminWorkItems({
        tab: workItemsTab,
        page: adminWorkItemsPage,
        pageSize: ADMIN_WORKITEMS_PAGE_SIZE,
      });
      if (res.success) {
        setAdminWorkItems(res.data.items);
        setAdminWorkItemsTotalPages(res.data.totalPages);
        setAdminWorkItemsTotalCount(res.data.totalCount);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin work items:', err);
    } finally {
      setAdminWorkItemsLoading(false);
    }
  };

  // Reset page when the active tab changes
  useEffect(() => { setAdminWorkItemsPage(1); }, [workItemsTab]);

  // Re-fetch work items when page/tab changes
  const adminWorkItemsFirstRender = React.useRef(true);
  useEffect(() => {
    if (adminWorkItemsFirstRender.current) { adminWorkItemsFirstRender.current = false; fetchAdminWorkItems(); return; }
    fetchAdminWorkItems();
  }, [adminWorkItemsPage, workItemsTab]);

  if (adminLoading && !adminData) {
    return (
      <div className="loading-center">
        <Loader2 className="spinner" size={28} color="var(--primary)" />
        <span>Loading dashboard metrics...</span>
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="glass-panel" style={{
        padding: '30px', display: 'flex', alignItems: 'center', gap: '14px',
        borderColor: 'rgba(239,68,68,0.25)'
      }}>
        <AlertTriangle size={24} color="var(--danger)" />
        <div>
          <h3 style={{ color: 'var(--danger)', marginBottom: '4px' }}>Error loading Dashboard</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{adminError || 'No data returned.'}</p>
          <button className="btn btn-secondary" onClick={fetchAdminDashboard} style={{ marginTop: '12px' }}>
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  const { totalProjects, totalEmployees, totalWorkItems, totalBugs, statusCounts, employeeBreakdown } = adminData;

  const kpiCards = [
    {
      label: 'Total Projects',
      value: totalProjects,
      sub: 'Across the organization',
      icon: <Briefcase size={24} />,
      color: 'var(--primary)',
      glow: 'var(--primary-glow)',
      bg: 'rgba(139,122,208,0.15)',
      accent: 'hsla(243,75%,65%,0.12)',
    },
    {
      label: 'Work Items',
      value: totalWorkItems,
      sub: 'Tracked deliverables',
      icon: <CheckSquare size={24} />,
      color: 'var(--info)',
      glow: 'var(--info-glow)',
      bg: 'rgba(59,130,246,0.15)',
      accent: 'hsla(200,90%,60%,0.12)',
    },
    {
      label: 'Total Bugs',
      value: totalBugs,
      sub: `${statusCounts.fixed} fixed`,
      icon: <Bug size={24} />,
      color: 'var(--danger)',
      glow: 'var(--danger-glow)',
      bg: 'rgba(239,68,68,0.15)',
      accent: 'hsla(350,85%,62%,0.12)',
    },
    {
      label: 'Total Employees',
      value: totalEmployees,
      sub: 'Actively assigned',
      icon: <Users size={24} />,
      color: 'var(--success)',
      glow: 'var(--success-glow)',
      bg: 'rgba(52,211,153,0.15)',
      accent: 'hsla(158,64%,52%,0.12)',
    },
  ];

  // Colors are a validated categorical set (adjacent-pair CVD + normal-vision
  // separation checked with the dataviz palette validator) rather than picked
  // by eye. "Closed" is deliberately a de-emphasis neutral, not a categorical
  // hue — it reads as archived, not as active data.
  const statusCards = [
    { label: 'Assigned',       value: statusCounts.assigned,     color: '#1baf7a' },
    { label: 'Closed',         value: statusCounts.closed,       color: '#94a3b8' },
    { label: 'Completed',      value: statusCounts.completed,    color: '#008300' },
    { label: 'Fixed',          value: statusCounts.fixed,        color: '#eda100' },
    { label: 'Future Release', value: statusCounts.futureRelease, color: '#4a3aa7' },
    { label: 'In Progress',    value: statusCounts.inProgress,   color: '#eb6834' },
    { label: 'Open',           value: statusCounts.open,         color: '#e34948' },
    { label: 'Reopen',         value: statusCounts.reopen,       color: '#e87ba4' },
    { label: 'To Do',          value: statusCounts.todo,         color: '#2a78d6' },
  ];

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Project health, workloads and bug metrics.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {lastUpdatedAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <Clock size={13} />
              Updated {lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn btn-secondary" onClick={fetchAdminDashboard} style={{ gap: '8px' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '20px', display: 'flex', alignItems: 'flex-end', gap: '18px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700, paddingBottom: '9px' }}>
          <Filter size={15} color="var(--primary-hover)" />
          Filters
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project</label>
          <select
            className="form-select"
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            style={{ width: '210px', height: '38px', fontSize: '0.85rem' }}
          >
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</label>
          <select
            className="form-select"
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(e.target.value)}
            style={{ width: '210px', height: '38px', fontSize: '0.85rem' }}
          >
            <option value="">All Employees</option>
            {employeesList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</label>
          <input
            type="date"
            className="form-input"
            value={filterFromDate}
            max={filterToDate || undefined}
            onChange={(e) => setFilterFromDate(e.target.value)}
            style={{ width: '160px', height: '38px', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</label>
          <input
            type="date"
            className="form-input"
            value={filterToDate}
            min={filterFromDate || undefined}
            onChange={(e) => setFilterToDate(e.target.value)}
            style={{ width: '160px', height: '38px', fontSize: '0.85rem' }}
          />
        </div>

        {hasActiveFilters && (
          <button className="btn btn-secondary" onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '38px', fontSize: '0.82rem' }}>
            <X size={14} />
            Clear
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '9px' }}>
          {adminLoading && <Loader2 size={16} className="spinner" style={{ color: 'var(--primary)' }} />}
          {adminError && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '0.8rem' }}>
              <AlertTriangle size={14} />
              {adminError}
            </span>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '-8px', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active filters:</span>
          {filterProjectId && (
            <span className="badge badge-assigned" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Project: {projects.find(p => String(p.id) === filterProjectId)?.name || filterProjectId}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterProjectId('')} />
            </span>
          )}
          {filterEmployeeId && (
            <span className="badge badge-assigned" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Employee: {employeesList.find(e => String(e.id) === filterEmployeeId)?.name || filterEmployeeId}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterEmployeeId('')} />
            </span>
          )}
          {filterFromDate && (
            <span className="badge badge-assigned" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              From: {filterFromDate}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterFromDate('')} />
            </span>
          )}
          {filterToDate && (
            <span className="badge badge-assigned" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              To: {filterToDate}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setFilterToDate('')} />
            </span>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '28px' }}>
        {kpiCards.map((card, i) => (
          <div
            key={card.label}
            className="glass-panel stat-card custom-card-highlight"
            style={{
              '--card-accent': card.accent,
              animationDelay: `${i * 0.08}s`
            } as React.CSSProperties}
          >
            <div className="stat-info">
              <h3>{card.label}</h3>
              <p style={{ color: card.color }}>{card.value}</p>
              <div className="stat-trend">
                <span>{card.sub}</span>
              </div>
            </div>
            <div className="stat-icon" style={{ background: card.bg, color: card.color, boxShadow: `0 0 20px ${card.glow}` }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Status Counts */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px' }}>
        <div className="section-header" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div className="section-title">
            <BarChart3 size={18} color="var(--primary-hover)" />
            Status Counts
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalWorkItems + totalBugs} total (work items + bugs)</span>
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

      {/* Employee Workload Table */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div className="section-header" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div className="section-title">
            <Users size={18} color="var(--secondary)" />
            Employee Workloads &amp; Task Distribution
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {employeeBreakdown.length} employees
          </span>
        </div>

        {employeeBreakdown.length === 0 ? (
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
                  <th>Open</th>
                  <th>Resolved</th>
                  <th>Closed</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {employeeBreakdown.map(emp => {
                  const resolved = emp.fixed + emp.completed;
                  const compPct = emp.totalAssigned > 0 ? (resolved / emp.totalAssigned) * 100 : 0;
                  return (
                    <tr key={emp.employeeId}>
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
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.employeeName}</span>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.totalAssigned}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{emp.todo + emp.assigned + emp.reopen}</td>
                      <td><span style={{ color: '#38bdf8', fontWeight: 600 }}>{emp.inProgress}</span></td>
                      <td><span style={{ color: '#f87171', fontWeight: 600 }}>{emp.open}</span></td>
                      <td><span style={{ color: '#4ade80', fontWeight: 600 }}>{resolved}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{emp.closed}</td>
                      <td>
                        <RadialMeter percent={compPct} size={38} strokeWidth={4} color="var(--success)" trackColor="var(--success-glow)" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== WORK ITEMS (All / Open / Fixed) ====== */}
      <div className="glass-panel" style={{ padding: '28px', marginTop: '28px' }}>
        <div className="section-header" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div className="section-title">
            <Bug size={18} color="var(--danger)" />
            Work Items
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{adminWorkItemsTotalCount} items</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div className="tabs-container">
            {(['all', 'open', 'closed'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                className={`tab-btn ${workItemsTab === tab ? 'active' : ''}`}
                onClick={() => setWorkItemsTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {adminWorkItemsLoading && <Loader2 size={16} className="spinner" style={{ color: 'var(--primary)' }} />}
        </div>

        {/* Work Items Table */}
        {adminWorkItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {adminWorkItemsLoading ? 'Loading...' : 'No work items found.'}
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Work ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Project</th>
                  <th>Raised By</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {adminWorkItems.map(item => {
                  const statusColors: Record<string, { color: string; bg: string }> = {
                    todo:           { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
                    pending:        { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
                    assigned:       { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
                    open:           { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
                    reopened:       { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
                    in_progress:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                    future_release: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
                    fixed:          { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
                    completed:      { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                    closed:         { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
                  };
                  const sc = statusColors[item.status] || { color: 'var(--text-muted)', bg: 'transparent' };
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem' }}>{item.workNumber}</td>
                      <td style={{ fontWeight: 600 }}>{item.title}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.workType || '-'}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.projectName || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.createdBy || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.assignedTo || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                      <td>
                        <span className="badge" style={{ background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                          {item.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {adminWorkItemsTotalCount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginTop: '20px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text-secondary)' }}>{(adminWorkItemsPage - 1) * ADMIN_WORKITEMS_PAGE_SIZE + 1}</strong>
              {'–'}
              <strong style={{ color: 'var(--text-secondary)' }}>{Math.min(adminWorkItemsPage * ADMIN_WORKITEMS_PAGE_SIZE, adminWorkItemsTotalCount)}</strong>
              {' of '}
              <strong style={{ color: 'var(--text-secondary)' }}>{adminWorkItemsTotalCount}</strong> items
            </span>

            {adminWorkItemsTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setAdminWorkItemsPage(1)}
                  disabled={adminWorkItemsPage === 1}
                  title="First page"
                  style={{ padding: '6px 8px' }}
                >
                  <ChevronsLeft size={15} />
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setAdminWorkItemsPage(prev => Math.max(prev - 1, 1))}
                  disabled={adminWorkItemsPage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.82rem' }}
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                {getPageNumbers(adminWorkItemsPage, adminWorkItemsTotalPages).map((p, idx) =>
                  p === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>&hellip;</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setAdminWorkItemsPage(p)}
                      className={p === adminWorkItemsPage ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ minWidth: '34px', height: '34px', padding: 0, fontSize: '0.82rem', fontWeight: p === adminWorkItemsPage ? 700 : 500 }}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className="btn btn-secondary"
                  onClick={() => setAdminWorkItemsPage(prev => Math.min(prev + 1, adminWorkItemsTotalPages))}
                  disabled={adminWorkItemsPage === adminWorkItemsTotalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.82rem' }}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setAdminWorkItemsPage(adminWorkItemsTotalPages)}
                  disabled={adminWorkItemsPage === adminWorkItemsTotalPages}
                  title="Last page"
                  style={{ padding: '6px 8px' }}
                >
                  <ChevronsRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const getPageNumbers = (current: number, total: number): (number | 'ellipsis')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
};
