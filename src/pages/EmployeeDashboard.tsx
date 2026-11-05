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
  Bug,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Pencil
} from 'lucide-react';
import { api, EmployeeDashboardResponseDto, WorkItemDto, EmployeeDropdownDto } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summary, setSummary] = useState<EmployeeDashboardResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [employees, setEmployees] = useState<EmployeeDropdownDto[]>([]);

  // Work Items table state
  const [myWorkItems, setMyWorkItems] = useState<WorkItemDto[]>([]);
  const [myWorkItemsTotalPages, setMyWorkItemsTotalPages] = useState(1);
  const [myWorkItemsTotalCount, setMyWorkItemsTotalCount] = useState(0);
  const [myWorkItemsPage, setMyWorkItemsPage] = useState(1);
  const [myWorkItemsLoading, setMyWorkItemsLoading] = useState(false);
  const [workItemsSearch, setWorkItemsSearch] = useState('');
  const [workItemsStatus, setWorkItemsStatus] = useState('all');
  const [workItemsFromDueDate, setWorkItemsFromDueDate] = useState('');
  const [workItemsToDueDate, setWorkItemsToDueDate] = useState('');
  const MY_WORKITEMS_PAGE_SIZE = 10;
  const debouncedWorkItemsSearch = useDebounce(workItemsSearch, 400);
  const hasWorkItemFilters = !!(workItemsSearch || workItemsStatus !== 'all' || workItemsFromDueDate || workItemsToDueDate);
  const clearWorkItemFilters = () => {
    setWorkItemsSearch('');
    setWorkItemsStatus('all');
    setWorkItemsFromDueDate('');
    setWorkItemsToDueDate('');
  };

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

  const fetchEmployees = async () => {
    try {
      const res = await api.getEmployeesDropdown();
      if (res.success) setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  useEffect(() => { fetchSummary(); fetchEmployees(); }, []);

  // Fetch employee work items (paginated + filtered)
  const fetchMyWorkItems = async () => {
    setMyWorkItemsLoading(true);
    try {
      const res = await api.getEmployeeWorkItems({
        page: myWorkItemsPage,
        pageSize: MY_WORKITEMS_PAGE_SIZE,
        search: workItemsSearch || undefined,
        status: workItemsStatus !== 'all' ? workItemsStatus : undefined,
        fromDueDate: workItemsFromDueDate || undefined,
        toDueDate: workItemsToDueDate || undefined,
      });
      if (res.success) {
        setMyWorkItems(res.data.items);
        setMyWorkItemsTotalPages(res.data.totalPages);
        setMyWorkItemsTotalCount(res.data.totalCount);
      }
    } catch (err: any) {
      console.error('Failed to fetch employee work items:', err);
    } finally {
      setMyWorkItemsLoading(false);
    }
  };

  // Reset page when filters change
  useEffect(() => { setMyWorkItemsPage(1); }, [debouncedWorkItemsSearch, workItemsStatus, workItemsFromDueDate, workItemsToDueDate]);

  // Re-fetch work items when page/filters change
  const myWorkItemsFirstRender = React.useRef(true);
  useEffect(() => {
    if (myWorkItemsFirstRender.current) { myWorkItemsFirstRender.current = false; fetchMyWorkItems(); return; }
    fetchMyWorkItems();
  }, [myWorkItemsPage, debouncedWorkItemsSearch, workItemsStatus, workItemsFromDueDate, workItemsToDueDate]);

  const handleStatusChange = async (workItemId: number, status: string) => {
    try {
      await api.updateWorkItemStatus(workItemId, status);
      fetchMyWorkItems();
      fetchSummary();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleAssigneeChange = async (workItemId: number, userId: string) => {
    try {
      await api.reassignWorkItem(workItemId, userId ? parseInt(userId) : null);
      fetchMyWorkItems();
    } catch (err) {
      console.error('Failed to reassign', err);
    }
  };

  const handleDueDateChange = async (workItemId: number, dueDate: string) => {
    try {
      await api.updateWorkItemDueDate(workItemId, dueDate || null);
      fetchMyWorkItems();
    } catch (err) {
      console.error('Failed to update due date', err);
    }
  };

  // Inline title editing
  const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  const startEditTitle = (item: WorkItemDto) => {
    setEditingTitleId(item.id);
    setEditingTitleValue(item.title);
  };

  const cancelEditTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  };

  const saveTitle = async (workItemId: number) => {
    const trimmed = editingTitleValue.trim();
    if (!trimmed) { cancelEditTitle(); return; }
    try {
      await api.updateWorkItem(workItemId, { title: trimmed });
      setEditingTitleId(null);
      fetchMyWorkItems();
    } catch (err) {
      console.error('Failed to update title', err);
    }
  };

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
    { label: 'Assigned',            value: statusCounts.assigned,             color: '#1baf7a' },
    { label: 'In-Progress',         value: statusCounts.inProgress,           color: '#eb6834' },
    { label: 'Completed',           value: statusCounts.completed,            color: '#008300' },
    { label: 'Testing In-Progress', value: statusCounts.testingInProgress || 0, color: '#0284c7' },
    { label: 'Bugs',                value: statusCounts.bugs || 0,              color: '#ef4444' },
    { label: 'Open',                value: statusCounts.open,                 color: '#e34948' },
    { label: 'Fixed',               value: statusCounts.fixed,                color: '#eda100' },
    { label: 'Re-Open',             value: statusCounts.reopen,               color: '#e87ba4' },
    { label: 'Testing Completed',   value: statusCounts.testingCompleted || 0, color: '#10b981' },
    { label: 'Released',            value: (statusCounts.released || 0) + (statusCounts.closed || 0), color: '#8b5cf6' },
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
            My Products
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalProjects} products</span>
        </div>

        {assignedProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Briefcase size={28} /></div>
            <h3>No products assigned yet.</h3>
            <p>Products you're assigned to will appear here.</p>
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

      {/* ====== ALL WORK ITEMS OF PROJECT ====== */}
      <div className="glass-panel" style={{ padding: '28px', marginTop: '28px' }}>
        <div className="section-header" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div className="section-title">
            <Bug size={18} color="var(--danger)" />
            All Work Items of Project
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {myWorkItemsTotalCount} items
            {myWorkItemsLoading && <Loader2 size={14} className="spinner" style={{ color: 'var(--primary)', marginLeft: '8px', verticalAlign: 'middle' }} />}
          </span>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search title or USE-BUG-001..."
              value={workItemsSearch}
              onChange={(e) => setWorkItemsSearch(e.target.value)}
              style={{ paddingLeft: '12px', height: '38px', fontSize: '0.85rem' }}
            />
          </div>
          <select
            className="form-select"
            value={workItemsStatus}
            onChange={(e) => setWorkItemsStatus(e.target.value)}
            style={{ width: '160px', height: '38px', paddingTop: 0, paddingBottom: 0, paddingRight: '30px', paddingLeft: '12px', fontSize: '0.85rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="reopened">Reopened</option>
            <option value="future_release">Future Release</option>
            <option value="fixed">Fixed</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              className="form-input"
              value={workItemsFromDueDate}
              max={workItemsToDueDate || undefined}
              onChange={(e) => setWorkItemsFromDueDate(e.target.value)}
              title="From due date"
              style={{ width: '145px', height: '38px', cursor: 'pointer', padding: '0 8px', fontSize: '0.85rem' }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
            <input
              type="date"
              className="form-input"
              value={workItemsToDueDate}
              min={workItemsFromDueDate || undefined}
              onChange={(e) => setWorkItemsToDueDate(e.target.value)}
              title="To due date"
              style={{ width: '145px', height: '38px', cursor: 'pointer', padding: '0 8px', fontSize: '0.85rem' }}
            />
          </div>
          {hasWorkItemFilters && (
            <button
              type="button"
              onClick={clearWorkItemFilters}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Work Items Table */}
        {myWorkItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {myWorkItemsLoading ? 'Loading...' : 'No work items found matching your filters.'}
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Work ID</th>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Product</th>
                  <th>Module</th>
                  <th>Type</th>
                  <th>Issue Type</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th>Team</th>
                  <th>Raised By</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {myWorkItems.map(item => {
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
                  const sc = statusColors[item.status?.toLowerCase()] || { color: 'var(--text-muted)', bg: 'transparent' };
                  return (
                    <tr key={item.id}>
                      <td 
                        style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => navigate(`/workitems/${item.id}`)}
                        title="Click to view details"
                      >
                        {item.workNumber}
                      </td>
                      <td style={{ fontWeight: 600, minWidth: '160px' }}>
                        {editingTitleId === item.id ? (
                          <input
                            type="text"
                            className="form-input"
                            value={editingTitleValue}
                            autoFocus
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onBlur={() => saveTitle(item.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTitle(item.id);
                              if (e.key === 'Escape') cancelEditTitle();
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.85rem', height: 'auto', width: '100%', minWidth: '160px' }}
                          />
                        ) : (
                          <span
                            onClick={() => startEditTitle(item)}
                            title="Click to edit title"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                          >
                            {item.title}
                            <Pencil size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{item.clientName || '-'}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.productName || item.projectName || '-'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{item.moduleName || '-'}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.workType || '-'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{item.issueType || '-'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{item.severity || '-'}</td>
                      <td style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{item.priority || '-'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{item.team || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.createdBy || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <select
                          className="form-select"
                          value={item.assignedToUserId?.toString() || ''}
                          onChange={(e) => handleAssigneeChange(item.id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.82rem', height: 'auto', minWidth: '120px' }}
                        >
                          <option value="">Unassigned</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.78rem',
                            height: 'auto',
                            minWidth: '110px',
                            backgroundColor: sc.bg,
                            color: sc.color,
                            fontWeight: 700,
                            borderColor: sc.color
                          }}
                        >
                          <option value="todo">TO DO</option>
                          <option value="pending">PENDING</option>
                          <option value="assigned">ASSIGNED</option>
                          <option value="open">OPEN</option>
                          <option value="reopened">REOPENED</option>
                          <option value="in_progress">IN PROGRESS</option>
                          <option value="future_release">FUTURE RELEASE</option>
                          <option value="fixed">FIXED</option>
                          <option value="completed">COMPLETED</option>
                          <option value="closed">CLOSED</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ fontSize: '0.82rem' }}>
                        <input
                          type="date"
                          className="form-input"
                          value={item.dueDate ? item.dueDate.split('T')[0] : ''}
                          onChange={(e) => handleDueDateChange(item.id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.82rem', height: 'auto', width: '115px' }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {myWorkItemsTotalCount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginTop: '20px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text-secondary)' }}>{(myWorkItemsPage - 1) * MY_WORKITEMS_PAGE_SIZE + 1}</strong>
              {'–'}
              <strong style={{ color: 'var(--text-secondary)' }}>{Math.min(myWorkItemsPage * MY_WORKITEMS_PAGE_SIZE, myWorkItemsTotalCount)}</strong>
              {' of '}
              <strong style={{ color: 'var(--text-secondary)' }}>{myWorkItemsTotalCount}</strong> items
            </span>

            {myWorkItemsTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setMyWorkItemsPage(1)}
                  disabled={myWorkItemsPage === 1}
                  title="First page"
                  style={{ padding: '6px 8px' }}
                >
                  <ChevronsLeft size={15} />
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setMyWorkItemsPage(prev => Math.max(prev - 1, 1))}
                  disabled={myWorkItemsPage === 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.82rem' }}
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                {getPageNumbers(myWorkItemsPage, myWorkItemsTotalPages).map((p, idx) =>
                  p === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>&hellip;</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setMyWorkItemsPage(p)}
                      className={p === myWorkItemsPage ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ minWidth: '34px', height: '34px', padding: 0, fontSize: '0.82rem', fontWeight: p === myWorkItemsPage ? 700 : 500 }}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  className="btn btn-secondary"
                  onClick={() => setMyWorkItemsPage(prev => Math.min(prev + 1, myWorkItemsTotalPages))}
                  disabled={myWorkItemsPage === myWorkItemsTotalPages}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.82rem' }}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setMyWorkItemsPage(myWorkItemsTotalPages)}
                  disabled={myWorkItemsPage === myWorkItemsTotalPages}
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
