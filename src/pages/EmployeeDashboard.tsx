import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { toast } from '../services/toast';
import { 
  CheckSquare, 
  Bug, 
  Clock, 
  AlertTriangle,
  User, 
  Search,
  ExternalLink,
  Loader2,
  Download,
  Zap,
  PlusCircle,
  X
} from 'lucide-react';
import { api, WorkItemDto, BugDto, API_BASE_URL } from '../services/api';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPM = user?.userType === 'ProductManager';

  const [tasks, setTasks] = useState<WorkItemDto[]>([]);
  const [tasksTotalCount, setTasksTotalCount] = useState(0);
  const [tasksTotalPages, setTasksTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState('');
  const [bugs, setBugs] = useState<BugDto[]>([]);
  const [involvedTasks, setInvolvedTasks] = useState<WorkItemDto[]>([]);

  // Task-specific filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [workTypeFilter, setWorkTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Pagination State
  const [taskPage, setTaskPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Modal states
  const [showCreateFunctional, setShowCreateFunctional] = useState(false);
  const [selectedProjectIdForCreation, setSelectedProjectIdForCreation] = useState<number | ''>('');
  const [createAnother, setCreateAnother] = useState(false);
  const [functionalWorkType, setFunctionalWorkType] = useState('Functional Requirements');
  const [functionalStatus, setFunctionalStatus] = useState('pending');
  const [functionalStartDate, setFunctionalStartDate] = useState('');
  const [functionalDueDate, setFunctionalDueDate] = useState('');
  const [functionalParentId, setFunctionalParentId] = useState<number | ''>('');
  const [functionalLabel, setFunctionalLabel] = useState('');
  const [functionalTeam, setFunctionalTeam] = useState('');
  const [uploadedAttachmentUrls, setUploadedAttachmentUrls] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [creatingWorkItem, setCreatingWorkItem] = useState(false);

  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDesc, setNewWorkDesc] = useState('');
  const [newWorkAssignedId, setNewWorkAssignedId] = useState<number | ''>('');
  const [newWorkPriority, setNewWorkPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const [workTitleError, setWorkTitleError] = useState('');
  const [projectSelectError, setProjectSelectError] = useState('');
  
  // Epic & Bug extra fields
  const [bugSeverity, setBugSeverity] = useState('3');
  const [bugIssueType, setBugIssueType] = useState('New');
  const [newEpicName, setNewEpicName] = useState('');
  const [newEpicColor, setNewEpicColor] = useState('purple');
  const [submissionType, setSubmissionType] = useState<'standard' | 'another' | 'copy'>('standard');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, employeesRes] = await Promise.all([
        api.getMyWorkItemsPaged({ page: 1, pageSize: ITEMS_PER_PAGE }),
        api.getAllProjects(),
        api.getEmployeesDropdown()
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.data.items);
        setTasksTotalCount(tasksRes.data.totalCount);
        setTasksTotalPages(tasksRes.data.totalPages);
      }
      if (projectsRes.success) setProjects(projectsRes.data);
      if (employeesRes.success) setEmployees(employeesRes.data);

      // Load previously involved tasks (reassigned away)
      try {
        const involvedRes = await api.getInvolvedWorkItems();
        if (involvedRes.success) setInvolvedTasks(involvedRes.data);
      } catch (_) {}
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employee tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingFiles(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const res = await api.uploadAttachment(file);
        if (res.success) {
          urls.push(res.data);
          toast.success(`Attached ${file.name}`);
        }
      }
      setUploadedAttachmentUrls(prev => [...prev, ...urls]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload attachments');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleCreateFunctionalRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkTitleError('');
    setProjectSelectError('');

    if (!selectedProjectIdForCreation) {
      setProjectSelectError('Project is required');
      return;
    }
    if (!newWorkTitle.trim()) {
      setWorkTitleError('Summary is required');
      return;
    }

    setCreatingWorkItem(true);
    try {
      const res = await api.createWorkItem(Number(selectedProjectIdForCreation), {
        title: newWorkTitle,
        description: newWorkDesc,
        priority: newWorkPriority,
        status: functionalStatus,
        workType: functionalWorkType,
        startDate: functionalStartDate || null,
        dueDate: functionalDueDate || null,
        parentId: functionalWorkType === 'Epic' ? null : (functionalParentId === '' ? null : Number(functionalParentId)),
        labels: functionalLabel || null,
        team: functionalTeam || null,
        attachmentUrls: uploadedAttachmentUrls.join(',') || null,
        assignedToUserId: newWorkAssignedId === '' ? null : Number(newWorkAssignedId),
        epicName: functionalWorkType === 'Epic' ? newEpicName || newWorkTitle : null,
        epicColor: functionalWorkType === 'Epic' ? newEpicColor : null,
        severity: functionalWorkType === 'Bug' ? bugSeverity : null,
        issueType: functionalWorkType === 'Bug' ? bugIssueType : null
      });

      if (res.success) {
        toast.success('Work item created successfully!');
        
        // Refresh data
        fetchData();

        if (submissionType === 'another' || createAnother) {
          setNewWorkTitle('');
          setNewWorkDesc('');
          setUploadedAttachmentUrls([]);
          setWorkTitleError('');
        } else if (submissionType === 'copy') {
          // Keep all form state intact so they can create a copy immediately
          toast.info('Form values kept. You can now modify and create a copy.');
        } else {
          setShowCreateFunctional(false);
          setNewWorkTitle('');
          setNewWorkDesc('');
          setNewWorkPriority('medium');
          setNewWorkAssignedId('');
          setFunctionalStartDate('');
          setFunctionalDueDate('');
          setFunctionalParentId('');
          setFunctionalLabel('');
          setFunctionalTeam('');
          setUploadedAttachmentUrls([]);
          setBugSeverity('3');
          setBugIssueType('New');
          setNewEpicName('');
          setNewEpicColor('purple');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create work item');
    } finally {
      setCreatingWorkItem(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      const res = await api.updateWorkItemStatus(taskId, newStatus);
      if (res.success) {
        toast.success('Task status updated successfully!');
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      } else {
        toast.error(res.message || 'Failed to update status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    }
  };

  const handleUpdateBugStatus = async (bugId: number, newStatus: string) => {
    try {
      const res = await api.updateBugStatus(bugId, newStatus);
      if (res.success) {
        toast.success('Bug status updated successfully!');
        setBugs(prev => prev.map(b => b.id === bugId ? { ...b, status: newStatus as any } : b));
      } else {
        toast.error(res.message || 'Failed to update status');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    }
  };

  const downloadCSV = (filename: string, csvContent: string) => {
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const safeStr = (val: any) => {
    if (val === null || val === undefined) return '';
    return String(val);
  };

  const handleExportCSV = () => {
    if (tasks.length === 0) {
      toast.info('No data found to export.');
      return;
    }

    // Combined headers covering both tasks and bugs
    const headers = [
      'Type',
      'Number',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Project Name',
      'Project Code',
      'Assigned To',
      'Raised By / Created By',
      'Created On',
      'Due Date'
    ];

    const q = (val: any) => `"${safeStr(val).replace(/"/g, '""')}"`;

    const rows: string[] = [headers.join(',')];

    // For each work item, add a row
    tasks.forEach(t => {
      rows.push([
        q(t.workType || 'Task'),
        q(t.workNumber),
        q(t.title),
        q(t.description),
        q(t.status),
        q(t.priority),
        q(t.projectName),
        q(t.projectNumber),
        q(t.assignedTo || user?.name || ''),
        q(t.createdBy),
        q(new Date(t.createdAt).toLocaleDateString()),
        q(t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '')
      ].join(','));
    });

    const csvContent = rows.join('\n');
    downloadCSV('my_work_items.csv', csvContent);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch tasks from server when filter/page changes
  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const res = await api.getMyWorkItemsPaged({
        page: taskPage,
        pageSize: ITEMS_PER_PAGE,
        status: statusFilters.length > 0 ? statusFilters.join(',') : undefined,
        dueDate: dateFilter || undefined,
        search: searchQuery || undefined,
        workType: workTypeFilter !== 'all' ? workTypeFilter : undefined,
      });
      if (res.success) {
        setTasks(res.data.items);
        setTasksTotalCount(res.data.totalCount);
        setTasksTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  // Reset page to 1 when task filters change
  useEffect(() => {
    setTaskPage(1);
  }, [searchQuery, statusFilters, dateFilter, workTypeFilter]);

  // Re-fetch tasks when page or filters change (but skip initial mount — fetchData handles it)
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchTasks();
  }, [taskPage, searchQuery, statusFilters, dateFilter, workTypeFilter]);

  if (loading) {
    return (
      <div className="loading-center">
        <Loader2 className="spinner" size={28} color="var(--primary)" />
        <span>Loading your workspace...</span>
      </div>
    );
  }

  // KPI summaries (from loaded tasks slice)
  const pendingTasks = tasks.filter(t => (t.status === 'pending' || t.status === 'open' || t.status === 'assigned' || t.status === 'reopened') && t.workType?.toLowerCase() !== 'bug').length;
  const inProgressTasks = tasks.filter(t => (t.status === 'in_progress' || t.status === 'waiting_customer' || t.status === 'future_release' || t.status === 'testing') && t.workType?.toLowerCase() !== 'bug').length;
  const completedTasks = tasks.filter(t => (t.status === 'completed' || t.status === 'closed' || t.status === 'fixed' || t.status === 'resolved') && t.workType?.toLowerCase() !== 'bug').length;
  const activeBugs = tasks.filter(t => t.workType?.toLowerCase() === 'bug' && t.status !== 'completed' && t.status !== 'closed' && t.status !== 'fixed' && t.status !== 'resolved').length;

  // Tasks are already filtered + paginated by server
  const filteredTasks = tasks;
  const paginatedTasks = filteredTasks;
  const totalTaskPages = tasksTotalPages;

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>My Work Queue</h1>
          <p style={{ color: 'var(--text-muted)' }}>Your assigned tasks and bugs — all in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => { setShowCreateFunctional(true); setCreateAnother(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} />
            Create
          </button>
          <button className="btn btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} />
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={fetchData}>
            Sync Work
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="dashboard-grid">
        <div className="stat-card glass-panel custom-card-highlight">
          <div className="stat-info">
            <h3>Pending Tasks</h3>
            <p>{pendingTasks}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card glass-panel custom-card-highlight">
          <div className="stat-info">
            <h3>In Progress</h3>
            <p style={{ color: 'var(--warning)' }}>{inProgressTasks}</p>
          </div>
          <div className="stat-icon" style={{ background: 'var(--warning-glow)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card glass-panel custom-card-highlight">
          <div className="stat-info">
            <h3>Bugs Assigned</h3>
            <p style={{ color: 'var(--danger)' }}>{activeBugs}</p>
          </div>
          <div className="stat-icon" style={{ background: 'var(--danger-glow)', color: 'var(--danger)' }}>
            <Bug size={24} />
          </div>
        </div>

        <div className="stat-card glass-panel custom-card-highlight">
          <div className="stat-info">
            <h3>Completed</h3>
            <p style={{ color: 'var(--success)' }}>{completedTasks}</p>
          </div>
          <div className="stat-icon" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
            <CheckSquare size={24} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filter-bar">
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '280px' }}>
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search tasks and bugs by title, code, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '42px' }}
          />
        </div>
        {/* Checkbox Multi-Select Status Dropdown */}
        <div style={{ position: 'relative', width: '180px' }}>
          <button
            type="button"
            className="form-select"
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            style={{
              width: '180px',
              textAlign: 'left',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-md)',
              height: '42px',
              padding: '0 30px 0 16px',
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            {statusFilters.length === 0 
              ? 'All Statuses' 
              : `${statusFilters.length} Selected`}
          </button>

          {statusDropdownOpen && (
            <>
              <div 
                onClick={() => setStatusDropdownOpen(false)} 
                style={{ position: 'fixed', inset: 0, zIndex: 998 }}
              />
              <div 
                className="glass-panel" 
                style={{
                  position: 'absolute',
                  top: '46px',
                  left: 0,
                  right: 0,
                  zIndex: 999,
                  background: '#FFFFFF',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}
              >
                {[
                  { id: 'pending', label: 'TO DO' },
                  { id: 'assigned', label: 'ASSIGNED' },
                  { id: 'reopened', label: 'REOPEN' },
                  { id: 'in_progress', label: 'IN PROGRESS' },
                  { id: 'future_release', label: 'MOVED TO FUTURE' },
                  { id: 'completed', label: 'RESOLVED' },
                  { id: 'open', label: 'Open' },
                  { id: 'fixed', label: 'Fixed' }
                ].map((item) => {
                  const checked = statusFilters.includes(item.id);
                  return (
                    <label 
                      key={item.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-glow)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setStatusFilters(prev => prev.filter(x => x !== item.id));
                          } else {
                            setStatusFilters(prev => [...prev, item.id]);
                          }
                        }}
                        style={{
                          accentColor: 'var(--primary)',
                          width: '15px',
                          height: '15px',
                          cursor: 'pointer'
                        }}
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
                <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <button 
                    type="button" 
                    onClick={() => setStatusFilters([])}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Clear All
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setStatusDropdownOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <select
          className="form-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <select
          className="form-select"
          value={workTypeFilter}
          onChange={(e) => setWorkTypeFilter(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="all">All Work Types</option>
          <option value="Task">Tasks</option>
          <option value="Bug">Bugs</option>
          <option value="Epic">Epics</option>
          <option value="Functional Requirements">Functional Requirements</option>
          <option value="Design Update">Design Updates</option>
        </select>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            className="form-input"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              width: '150px',
              height: '42px',
              cursor: 'pointer',
              padding: '0 10px'
            }}
          />
          {dateFilter && (
            <button 
              type="button" 
              onClick={() => setDateFilter('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                whiteSpace: 'nowrap'
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Queue count header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
          My Work Items
        </span>
        <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
          {tasksTotalCount} items
        </span>
      </div>

      {/* UNIFIED QUEUE: JIRA-Style Tables */}
      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><CheckSquare size={28} /></div>
          <h3>No work items found.</h3>
          <p>No tasks or bugs assigned to you yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* TASKS TABLE */}
          {filteredTasks.length > 0 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Work Items Queue</h3>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}><input type="checkbox" disabled /></th>
                      <th>Work</th>
                      <th>Project</th>
                      <th>Assignee</th>
                      <th>Reporter</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Resolution</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTasks.map((item) => {
                      const isCompleted = item.status === 'completed' || item.status === 'closed';
                      const resolution = isCompleted ? 'Resolved' : 'Unresolved';
                      return (
                        <tr key={`task-${item.id}`}>
                          <td><input type="checkbox" /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {renderWorkTypeIcon(item.workType)}
                              <a
                                onClick={() => navigate(`/workitems/${item.id}`)}
                                style={{
                                  color: 'var(--primary)',
                                  fontWeight: 700,
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {item.workNumber}
                              </a>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {item.title}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {item.projectName || '—'}
                            </span>
                          </td>
                          <td>{renderUserAvatarAndName(user?.name)}</td>
                          <td>{renderUserAvatarAndName(item.createdBy)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {renderPriorityIcon(item.priority)}
                              <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{item.priority}</span>
                            </div>
                          </td>
                          <td>
                            <select
                              className="form-select"
                              value={item.status}
                              onChange={(e) => handleUpdateTaskStatus(item.id, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.82rem',
                                width: 'auto',
                                minWidth: '130px',
                                height: 'auto',
                                borderRadius: '4px'
                              }}
                            >
                              <option value="pending">TO DO</option>
                              <option value="assigned">ASSIGNED</option>
                              <option value="reopened">REOPEN</option>
                              <option value="in_progress">IN PROGRESS</option>
                              <option value="future_release">MOVED TO FUTURE RELEASE</option>
                              <option value="fixed">FIXED</option>
                              <option value="completed">RESOLVED</option>
                            </select>
                          </td>
                          <td>
                            <span style={{
                              color: isCompleted ? '#10B981' : '#6B7280',
                              fontWeight: 600,
                              fontSize: '0.85rem'
                            }}>
                              {resolution}
                            </span>
                          </td>
                          <td>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalTaskPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setTaskPage(prev => Math.max(prev - 1, 1))}
                    disabled={taskPage === 1}
                    style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Page {taskPage} of {totalTaskPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setTaskPage(prev => Math.min(prev + 1, totalTaskPages))}
                    disabled={taskPage === totalTaskPages}
                    style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BUGS TABLE REMOVED */}
        </div>
      )}

      {/* PREVIOUSLY WORKED ON / INVOLVED TASKS */}
      {involvedTasks.length > 0 && (
        <div style={{ marginTop: '40px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>
              Previously Worked On
            </span>
            <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
              {involvedTasks.length} items
            </span>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Involved Items Queue</h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}><input type="checkbox" disabled /></th>
                    <th>Work</th>
                    <th>Project</th>
                    <th>Current Assignee</th>
                    <th>Reporter</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Resolution</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {involvedTasks.map((item) => {
                    const isCompleted = item.status === 'completed' || item.status === 'closed';
                    const resolution = isCompleted ? 'Resolved' : 'Unresolved';
                    return (
                      <tr key={`involved-${item.id}`}>
                        <td><input type="checkbox" /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {renderWorkTypeIcon(item.workType)}
                            <a
                              onClick={() => navigate(`/workitems/${item.id}`)}
                              style={{
                                  color: 'var(--primary)',
                                  fontWeight: 700,
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                              }}
                            >
                              {item.workNumber}
                            </a>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              {item.title}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {item.projectName || '—'}
                          </span>
                        </td>
                        <td>{renderUserAvatarAndName(item.assignedTo)}</td>
                        <td>{renderUserAvatarAndName(item.createdBy)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {renderPriorityIcon(item.priority)}
                            <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{item.priority}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${item.status}`} style={{ textTransform: 'uppercase', fontSize: '0.72rem', padding: '3px 8px' }}>
                            {formatWorkItemStatus(item.status)}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            color: isCompleted ? '#10B981' : '#6B7280',
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}>
                            {resolution}
                          </span>
                        </td>
                        <td>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* CREATE FUNCTIONAL REQUIREMENTS MODAL (JIRA STYLE) */}
      {showCreateFunctional && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '680px', width: '95%', maxHeight: '92vh', overflowY: 'auto', padding: '28px' }}>
            <button className="modal-close" onClick={() => { setShowCreateFunctional(false); setWorkTitleError(''); setProjectSelectError(''); }}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '6px', fontWeight: 800, fontSize: '1.6rem' }} className="gradient-text">Create Work Item</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px' }}>Required fields are marked with an asterisk <span style={{ color: 'var(--danger)' }}>*</span></p>

            <form onSubmit={handleCreateFunctionalRequirement} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Space (Project selection) */}
              <div className="form-group">
                <label htmlFor="funcSpace">Space <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  id="funcSpace"
                  className="form-select"
                  value={selectedProjectIdForCreation}
                  onChange={(e) => {
                    setSelectedProjectIdForCreation(e.target.value === '' ? '' : Number(e.target.value));
                    if (e.target.value) setProjectSelectError('');
                  }}
                  style={projectSelectError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                >
                  <option value="">Select Space/Project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.projectNumber})
                    </option>
                  ))}
                </select>
                {projectSelectError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 500, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.9rem', lineHeight: 0 }}>♦</span>
                    <span>{projectSelectError}</span>
                  </div>
                )}
              </div>

              {/* Work Type & Status Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Work Type */}
                <div className="form-group">
                  <label htmlFor="funcWorkType">Work type <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    id="funcWorkType"
                    className="form-select"
                    value={functionalWorkType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFunctionalWorkType(val);
                      if (val === 'Bug') {
                        setFunctionalStatus('new');
                      } else {
                        setFunctionalStatus('pending');
                      }
                    }}
                  >
                    {isPM && <option value="Epic">⚡ Epic</option>}
                    <option value="Task">☑️ Task</option>
                    <option value="Functional Requirements">⚡ Functional Requirements</option>
                    <option value="Design Update">⚠️ Design Update</option>
                    <option value="Bug">🐞 Bug</option>
                  </select>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label htmlFor="funcStatus">Status</label>
                  <select
                    id="funcStatus"
                    className="form-select"
                    value={functionalStatus}
                    onChange={(e) => setFunctionalStatus(e.target.value)}
                  >
                    {functionalWorkType === 'Bug' ? (
                      <>
                        <option value="new">New</option>
                        <option value="open">Open</option>
                      </>
                    ) : (
                      <>
                        <option value="pending">TO DO</option>
                        <option value="assigned">ASSIGNED</option>
                        <option value="reopened">REOPEN</option>
                        <option value="in_progress">IN PROGRESS</option>
                        <option value="future_release">MOVED TO FUTURE RELEASE</option>
                        <option value="fixed">FIXED</option>
                        <option value="completed">RESOLVED</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Bug Issue Type Row */}
              {functionalWorkType === 'Bug' && (
                <div className="form-group">
                  <label htmlFor="bugIssueType">Issue Type</label>
                  <select
                    id="bugIssueType"
                    className="form-select"
                    value={bugIssueType}
                    onChange={(e) => setBugIssueType(e.target.value)}
                  >
                    <option value="New">New</option>
                    <option value="Reopen">Reopen</option>
                    <option value="Regression">Regression</option>
                  </select>
                </div>
              )}

              {/* Summary */}
              <div className="form-group">
                <label htmlFor="funcSummary">Summary <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="funcSummary"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Implement user login flow validation"
                  value={newWorkTitle}
                  onChange={(e) => {
                    setNewWorkTitle(e.target.value);
                    if (e.target.value.trim()) setWorkTitleError('');
                  }}
                  style={workTitleError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                />
                {workTitleError && (
                  <div style={{
                    color: 'var(--danger)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ fontSize: '0.9rem', lineHeight: 0 }}>♦</span>
                    <span>{workTitleError}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label htmlFor="funcDesc">Description</label>
                <textarea
                  id="funcDesc"
                  className="form-textarea"
                  rows={4}
                  placeholder="Describe the functional requirement details..."
                  value={newWorkDesc}
                  onChange={(e) => setNewWorkDesc(e.target.value)}
                  style={{ fontSize: '0.92rem' }}
                />
              </div>

              {/* Assignee Selection */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="funcAssignee" style={{ marginBottom: 0 }}>Assign To</label>
                </div>
                <select
                  id="funcAssignee"
                  className="form-select"
                  value={newWorkAssignedId}
                  onChange={(e) => setNewWorkAssignedId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">Automatic</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority & Parent Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Priority */}
                <div className="form-group">
                  <label htmlFor="funcPriority">Priority</label>
                  <select
                    id="funcPriority"
                    className="form-select"
                    value={newWorkPriority}
                    onChange={(e) => setNewWorkPriority(e.target.value as any)}
                  >
                    <option value="low">〓 Low</option>
                    <option value="medium">＝ Medium</option>
                    <option value="high">▲ High</option>
                    <option value="critical">▲ Critical</option>
                  </select>
                </div>

                {/* Bug → Severity */}
                {functionalWorkType === 'Bug' && (
                  <div className="form-group">
                    <label htmlFor="funcSeverity">Severity</label>
                    <select
                      id="funcSeverity"
                      className="form-select"
                      value={bugSeverity}
                      onChange={(e) => setBugSeverity(e.target.value)}
                    >
                      <option value="1">1 (Lowest)</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6 (Highest)</option>
                    </select>
                  </div>
                )}

                {/* Epic → Epic Name & Color */}
                {functionalWorkType === 'Epic' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="funcEpicName">Epic Name</label>
                      <input
                        id="funcEpicName"
                        type="text"
                        className="form-input"
                        placeholder="e.g. User Authentication"
                        value={newEpicName}
                        onChange={(e) => setNewEpicName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="funcEpicColor">Epic Color</label>
                      <select
                        id="funcEpicColor"
                        className="form-select"
                        value={newEpicColor}
                        onChange={(e) => setNewEpicColor(e.target.value)}
                      >
                        <option value="purple">🟣 Purple</option>
                        <option value="blue">🔵 Blue</option>
                        <option value="teal">💠 Teal</option>
                        <option value="green">🟢 Green</option>
                        <option value="orange">🟠 Orange</option>
                        <option value="red">🔴 Red</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Parent Selection */}
                {functionalWorkType !== 'Bug' && functionalWorkType !== 'Epic' && (
                  <div className="form-group">
                    <label htmlFor="funcParent">Parent</label>
                    <select
                      id="funcParent"
                      className="form-select"
                      value={functionalParentId}
                      onChange={(e) => setFunctionalParentId(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      <option value="">Select parent</option>
                      {(selectedProjectIdForCreation 
                        ? projects.find(p => p.id === Number(selectedProjectIdForCreation))?.workItems || [] 
                        : []
                      ).filter((item: any) => item.workType === 'Epic').map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.workNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Due Date & Start Date Row */}
              {functionalWorkType !== 'Bug' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Due Date */}
                  <div className="form-group">
                    <label htmlFor="funcDueDate">Due date</label>
                    <input
                      id="funcDueDate"
                      type="date"
                      className="form-input"
                      value={functionalDueDate}
                      onChange={(e) => setFunctionalDueDate(e.target.value)}
                    />
                  </div>

                  {/* Start Date */}
                  <div className="form-group">
                    <label htmlFor="funcStartDate">Start date</label>
                    <input
                      id="funcStartDate"
                      type="date"
                      className="form-input"
                      value={functionalStartDate}
                      onChange={(e) => setFunctionalStartDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Labels & Team Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Labels */}
                {functionalWorkType !== 'Bug' ? (
                  <div className="form-group">
                    <label htmlFor="funcLabels">Labels</label>
                    <select
                      id="funcLabels"
                      className="form-select"
                      value={functionalLabel}
                      onChange={(e) => setFunctionalLabel(e.target.value)}
                    >
                      <option value="">Select label</option>
                      <option value="frontend">Frontend</option>
                      <option value="backend">Backend</option>
                      <option value="ui/ux">UI/UX</option>
                      <option value="bugfix">Bugfix</option>
                      <option value="database">Database</option>
                      <option value="documentation">Documentation</option>
                    </select>
                  </div>
                ) : (
                  <div></div> /* spacing spacer */
                )}

                {/* Team */}
                <div className="form-group">
                  <label htmlFor="funcTeam">Team</label>
                  <select
                    id="funcTeam"
                    className="form-select"
                    value={functionalTeam}
                    onChange={(e) => setFunctionalTeam(e.target.value)}
                  >
                    <option value="">Choose a team</option>
                    <option value="Frontend Team">Frontend Team</option>
                    <option value="Backend Team">Backend Team</option>
                    <option value="QA Team">QA Team</option>
                    <option value="DevOps Team">DevOps Team</option>
                  </select>
                </div>
              </div>

              {/* Attachment */}
              <div className="form-group">
                <label>Attachment</label>
                <div 
                  style={{
                    border: '2px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    textAlign: 'center',
                    background: '#F8FAFC',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background-color 0.2s'
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
                    setUploadingFiles(true);
                    try {
                      const urls: string[] = [];
                      for (let i = 0; i < e.dataTransfer.files.length; i++) {
                        const file = e.dataTransfer.files[i];
                        const res = await api.uploadAttachment(file);
                        if (res.success) {
                          urls.push(res.data);
                          toast.success(`Attached ${file.name}`);
                        }
                      }
                      setUploadedAttachmentUrls(prev => [...prev, ...urls]);
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to upload attachments');
                    } finally {
                      setUploadingFiles(false);
                    }
                  }}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleAttachmentUpload}
                    style={{ display: 'none' }}
                    id="jiraFileInput"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.8rem', color: 'var(--text-muted)' }}>☁️</span>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      Drop files to attach or{' '}
                      <label 
                        htmlFor="jiraFileInput" 
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          background: 'rgba(0,0,0,0.04)',
                          border: '1px solid var(--border-soft)',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          marginLeft: '6px'
                        }}
                      >
                        Browse
                      </label>
                    </span>
                  </div>
                </div>

                {/* Uploaded attachments list */}
                {uploadedAttachmentUrls.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attached Files:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {uploadedAttachmentUrls.map((url, idx) => {
                        const fileName = url.substring(url.lastIndexOf('/') + 1);
                        return (
                          <div 
                            key={idx} 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: '#F1F5F9',
                              border: '1px solid var(--border-soft)',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              fontSize: '0.78rem'
                            }}
                          >
                            <a href={`${API_BASE_URL}${url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                              📎 {fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName}
                            </a>
                            <button
                              type="button"
                              onClick={() => setUploadedAttachmentUrls(prev => prev.filter((_, i) => i !== idx))}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                padding: '0 2px'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {uploadingFiles && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '6px', display: 'block' }}>
                    ⏳ Uploading files...
                  </span>
                )}
              </div>

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-soft)', paddingTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateFunctional(false); setWorkTitleError(''); setProjectSelectError(''); }}>
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                    type="submit" 
                    className="btn btn-secondary" 
                    style={{ borderColor: 'var(--border-medium)', color: 'var(--text-secondary)' }}
                    onClick={() => setSubmissionType('copy')}
                    disabled={creatingWorkItem}
                  >
                    {creatingWorkItem && submissionType === 'copy' ? 'Creating...' : 'Create Copy'}
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    onClick={() => setSubmissionType('another')}
                    disabled={creatingWorkItem}
                  >
                    {creatingWorkItem && submissionType === 'another' ? 'Creating...' : 'Create Another'}
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    onClick={() => setSubmissionType('standard')}
                    disabled={creatingWorkItem}
                  >
                    {creatingWorkItem && submissionType === 'standard' ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Helpers for JIRA Table elements
const renderPriorityIcon = (priority: string) => {
  const p = priority.toLowerCase();
  if (p === 'critical' || p === 'high') {
    return <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>⇈</span>;
  }
  if (p === 'medium') {
    return <span style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>＝</span>;
  }
  return <span style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>↓</span>;
};

const renderWorkTypeIcon = (type?: string) => {
  const t = (type || 'task').toLowerCase();
  if (t.includes('epic') || t.includes('functional') || t.includes('requirement')) {
    return <Zap size={15} fill="#C084FC" color="#A855F7" style={{ flexShrink: 0 }} />;
  }
  if (t.includes('bug')) {
    return <Bug size={15} fill="#FCA5A5" color="#EF4444" style={{ flexShrink: 0 }} />;
  }
  return <CheckSquare size={15} fill="#93C5FD" color="#2563EB" style={{ flexShrink: 0 }} />;
};

const renderUserAvatarAndName = (name?: string) => {
  const displayName = name || 'Unassigned';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Array of background colors for avatars to look vibrant
  const colors = ['#1E3A8A', '#0D9488', '#0891B2', '#4F46E5', '#7C3AED', '#DB2777'];
  const charSum = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[charSum % colors.length];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
      <div style={{
        width: '24px', height: '24px',
        borderRadius: '50%',
        background: color,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.72rem',
        fontWeight: 800,
        flexShrink: 0
      }}>
        {initials}
      </div>
      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{displayName}</span>
    </div>
  );
};

const formatWorkItemStatus = (status: string) => {
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
