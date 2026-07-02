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

  const [tasks, setTasks] = useState<WorkItemDto[]>([]);
  const [tasksTotalCount, setTasksTotalCount] = useState(0);
  const [tasksTotalPages, setTasksTotalPages] = useState(1);
  const [bugs, setBugs] = useState<BugDto[]>([]);
  const [bugsTotalCount, setBugsTotalCount] = useState(0);
  const [bugsTotalPages, setBugsTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [bugsLoading, setBugsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'bugs'>('tasks');

  // Task-specific filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Bug-specific filters
  const [bugSearchQuery, setBugSearchQuery] = useState('');
  const [bugStatusFilter, setBugStatusFilter] = useState('all');
  const [bugDateFilter, setBugDateFilter] = useState('');

  // Pagination State
  const [taskPage, setTaskPage] = useState(1);
  const [bugPage, setBugPage] = useState(1);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, bugsRes, projectsRes, employeesRes] = await Promise.all([
        api.getMyWorkItemsPaged({ page: 1, pageSize: ITEMS_PER_PAGE }),
        api.getMyBugsPaged({ page: 1, pageSize: ITEMS_PER_PAGE }),
        api.getAllProjects(),
        api.getEmployeesDropdown()
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.data.items);
        setTasksTotalCount(tasksRes.data.totalCount);
        setTasksTotalPages(tasksRes.data.totalPages);
      }
      if (bugsRes.success) {
        setBugs(bugsRes.data.items);
        setBugsTotalCount(bugsRes.data.totalCount);
        setBugsTotalPages(bugsRes.data.totalPages);
      }
      if (projectsRes.success) setProjects(projectsRes.data);
      if (employeesRes.success) setEmployees(employeesRes.data);
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
        parentId: functionalParentId === '' ? null : Number(functionalParentId),
        labels: functionalLabel || null,
        team: functionalTeam || null,
        attachmentUrls: uploadedAttachmentUrls.join(',') || null,
        assignedToUserId: newWorkAssignedId === '' ? null : Number(newWorkAssignedId)
      });

      if (res.success) {
        toast.success('Work item created successfully!');
        
        // Refresh data
        fetchData();

        if (createAnother) {
          setNewWorkTitle('');
          setNewWorkDesc('');
          setUploadedAttachmentUrls([]);
          setWorkTitleError('');
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
    if (tasks.length === 0 && bugs.length === 0) {
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
      'Linked Task Number',
      'Linked Task Title',
      'Created On',
      'Due Date',
      'Fixed On',
      'Closed On'
    ];

    const q = (val: any) => `"${safeStr(val).replace(/"/g, '""')}"`;

    const rows: string[] = [headers.join(',')];

    // For each task, add task row then any bugs linked to that task
    tasks.forEach(t => {
      // Task row
      rows.push([
        q('Task'),
        q(t.workNumber),
        q(t.title),
        q(t.description),
        q(t.status),
        q(t.priority),
        q(t.projectName),
        q(t.projectNumber),
        q(t.assignedTo || user?.name || ''),
        q(t.createdBy),
        q(''),                          // Linked Task Number (N/A for tasks)
        q(''),                          // Linked Task Title (N/A for tasks)
        q(new Date(t.createdAt).toLocaleDateString()),
        q(t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''),
        q(''),                          // Fixed On (N/A for tasks)
        q('')                           // Closed On (N/A for tasks)
      ].join(','));

      // Bugs linked to this task
      const linkedBugs = bugs.filter(b => b.workItemId === t.id);
      linkedBugs.forEach(b => {
        rows.push([
          q('Bug'),
          q(b.bugNumber),
          q(b.title),
          q(b.description),
          q(b.status),
          q(''),                        // Priority (N/A for bugs)
          q(t.projectName),
          q(t.projectNumber),
          q(b.assignedTo || ''),
          q(b.raisedBy),
          q(b.workNumber),
          q(b.workItemTitle),
          q(new Date(b.createdAt).toLocaleDateString()),
          q(''),                        // Due Date (N/A for bugs)
          q(b.fixedAt ? new Date(b.fixedAt).toLocaleDateString() : ''),
          q(b.closedAt ? new Date(b.closedAt).toLocaleDateString() : '')
        ].join(','));
      });
    });

    // Also add any bugs NOT linked to tasks assigned to this employee
    // (bugs assigned to this employee on tasks NOT assigned to this employee)
    const taskIds = new Set(tasks.map(t => t.id));
    const orphanBugs = bugs.filter(b => !taskIds.has(b.workItemId));
    orphanBugs.forEach(b => {
      rows.push([
        q('Bug'),
        q(b.bugNumber),
        q(b.title),
        q(b.description),
        q(b.status),
        q(''),
        q(''),
        q(''),
        q(b.assignedTo || ''),
        q(b.raisedBy),
        q(b.workNumber),
        q(b.workItemTitle),
        q(new Date(b.createdAt).toLocaleDateString()),
        q(''),
        q(b.fixedAt ? new Date(b.fixedAt).toLocaleDateString() : ''),
        q(b.closedAt ? new Date(b.closedAt).toLocaleDateString() : '')
      ].join(','));
    });

    const csvContent = rows.join('\n');
    downloadCSV('my_tasks_and_bugs.csv', csvContent);
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
        status: statusFilter !== 'all' ? statusFilter : undefined,
        dueDate: dateFilter || undefined,
        search: searchQuery || undefined,
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
  }, [searchQuery, statusFilter, dateFilter]);

  // Re-fetch tasks when page or filters change (but skip initial mount — fetchData handles it)
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchTasks();
  }, [taskPage, searchQuery, statusFilter, dateFilter]);

  // fetchBugs — server-side bug query
  const fetchBugs = async () => {
    setBugsLoading(true);
    try {
      const res = await api.getMyBugsPaged({
        page: bugPage,
        pageSize: ITEMS_PER_PAGE,
        status: bugStatusFilter !== 'all' ? bugStatusFilter : undefined,
        date: bugDateFilter || undefined,
        search: bugSearchQuery || undefined,
      });
      if (res.success) {
        setBugs(res.data.items);
        setBugsTotalCount(res.data.totalCount);
        setBugsTotalPages(res.data.totalPages);
      }
    } catch (err: any) {
      console.error('Failed to fetch bugs:', err);
    } finally {
      setBugsLoading(false);
    }
  };

  // Reset bug page to 1 when bug filters change
  useEffect(() => {
    setBugPage(1);
  }, [bugSearchQuery, bugStatusFilter, bugDateFilter]);

  // Re-fetch bugs when bug page or filters change
  const isFirstRenderBugs = React.useRef(true);
  useEffect(() => {
    if (isFirstRenderBugs.current) { isFirstRenderBugs.current = false; return; }
    fetchBugs();
  }, [bugPage, bugSearchQuery, bugStatusFilter, bugDateFilter]);

  if (loading) {
    return (
      <div className="loading-center">
        <Loader2 className="spinner" size={28} color="var(--primary)" />
        <span>Loading your workspace...</span>
      </div>
    );
  }

  // KPI summaries (from loaded tasks slice — still accurate because we load all for overview)
  const pendingTasks = tasks.filter(t => t.status === 'pending' && t.workType?.toLowerCase() !== 'bug').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' && t.workType?.toLowerCase() !== 'bug').length;
  const testingTasks = tasks.filter(t => t.status === 'testing' && t.workType?.toLowerCase() !== 'bug').length;
  const completedTasks = tasks.filter(t => (t.status === 'completed' || t.status === 'closed') && t.workType?.toLowerCase() !== 'bug').length;
  
  const activeBugs = bugs.filter(b => b.status === 'open' || b.status === 'in_progress').length;

  // Tasks are already filtered + paginated by server
  const filteredTasks = tasks.filter(t => t.workType?.toLowerCase() !== 'bug');
  const paginatedTasks = filteredTasks;
  const totalTaskPages = tasksTotalPages;

  // Bugs are now server-side filtered + paginated
  const paginatedBugs = bugs;
  const totalBugPages = bugsTotalPages;

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
            Create Functional Requirement
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
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <h3>Pending Tasks</h3>
            <p>{pendingTasks}</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-info">
            <h3>In Progress</h3>
            <p style={{ color: 'var(--warning)' }}>{inProgressTasks}</p>
          </div>
          <div className="stat-icon" style={{ background: 'var(--warning-glow)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-info">
            <h3>Bugs Assigned</h3>
            <p style={{ color: 'var(--danger)' }}>{activeBugs}</p>
          </div>
          <div className="stat-icon" style={{ background: 'var(--danger-glow)', color: 'var(--danger)' }}>
            <Bug size={24} />
          </div>
        </div>

        <div className="stat-card glass-panel">
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
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">TO DO</option>
          <option value="assigned">ASSIGNED</option>
          <option value="reopened">REOPEN</option>
          <option value="in_progress">IN PROGRESS</option>
          <option value="waiting_customer">WAITING FOR CUSTOMER</option>
          <option value="future_release">MOVED TO FUTURE RELEASE</option>
          <option value="completed">RESOLVED</option>
          <option value="open">Open (Bugs)</option>
          <option value="fixed">Fixed (Bugs)</option>
        </select>
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
          {filteredTasks.length} tasks
        </span>
        {bugsTotalCount > 0 && (
          <span style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', borderRadius: '999px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
            {bugsTotalCount} bugs
          </span>
        )}
      </div>

      {/* UNIFIED QUEUE: JIRA-Style Tables */}
      {filteredTasks.length === 0 && bugs.length === 0 ? (
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
              <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Tasks Queue</h3>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}><input type="checkbox" disabled /></th>
                      <th>Work</th>
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
                              <option value="waiting_customer">WAITING FOR CUSTOMER</option>
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

          {/* BUGS TABLE */}
          {bugsTotalCount > 0 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              {/* Bug-specific filter bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginRight: '8px', whiteSpace: 'nowrap' }}>Bugs Queue</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
                  <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search bugs by title or BUG-001..."
                    value={bugSearchQuery}
                    onChange={(e) => setBugSearchQuery(e.target.value)}
                    style={{ paddingLeft: '12px', height: '36px', fontSize: '0.85rem' }}
                  />
                </div>
                <select
                  className="form-select"
                  value={bugStatusFilter}
                  onChange={(e) => setBugStatusFilter(e.target.value)}
                  style={{ width: '160px', height: '36px', paddingTop: 0, paddingBottom: 0, paddingRight: '30px', paddingLeft: '12px', fontSize: '0.85rem' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="fixed">Fixed</option>
                  <option value="closed">Closed</option>
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={bugDateFilter}
                    onChange={(e) => setBugDateFilter(e.target.value)}
                    style={{ width: '145px', height: '36px', cursor: 'pointer', padding: '0 8px', fontSize: '0.85rem' }}
                  />
                  {bugDateFilter && (
                    <button
                      type="button"
                      onClick={() => setBugDateFilter('')}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {bugsLoading && <Loader2 size={16} className="spinner" style={{ color: 'var(--primary)' }} />}
              </div>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}><input type="checkbox" disabled /></th>
                      <th>Work</th>
                      <th>Assignee</th>
                      <th>Reporter</th>
                      <th>Status</th>
                      <th>Resolution</th>
                      <th>Created</th>
                      <th>Fixed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBugs.map((bug) => {
                      const isClosed = bug.status === 'closed';
                      const resolution = isClosed ? 'Resolved' : 'Unresolved';
                      return (
                        <tr key={`bug-${bug.id}`}>
                          <td><input type="checkbox" /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Bug size={15} fill="#FCA5A5" color="#EF4444" style={{ flexShrink: 0 }} />
                              <a
                                onClick={() => navigate(`/bugs/${bug.id}`)}
                                style={{
                                  color: 'var(--primary)',
                                  fontWeight: 700,
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {bug.bugNumber}
                              </a>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {bug.title}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                (Task: {bug.workNumber})
                              </span>
                            </div>
                          </td>
                          <td>{renderUserAvatarAndName(bug.assignedTo || user?.name)}</td>
                          <td>{renderUserAvatarAndName(bug.raisedBy)}</td>
                          <td>
                            <select
                              className="form-select"
                              value={bug.status}
                              onChange={(e) => handleUpdateBugStatus(bug.id, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.82rem',
                                width: 'auto',
                                minWidth: '120px',
                                height: 'auto',
                                borderRadius: '4px'
                              }}
                            >
                              <option value="open">OPEN</option>
                              <option value="in_progress">IN PROGRESS</option>
                              <option value="fixed">FIXED</option>
                              <option value="closed">CLOSED</option>
                            </select>
                          </td>
                          <td>
                            <span style={{
                              color: isClosed ? '#10B981' : '#6B7280',
                              fontWeight: 600,
                              fontSize: '0.85rem'
                            }}>
                              {resolution}
                            </span>
                          </td>
                          <td>{new Date(bug.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td>{bug.fixedAt ? new Date(bug.fixedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalBugPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-soft)', paddingTop: '16px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setBugPage(prev => Math.max(prev - 1, 1))}
                    disabled={bugPage === 1}
                    style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Page {bugPage} of {totalBugPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setBugPage(prev => Math.min(prev + 1, totalBugPages))}
                    disabled={bugPage === totalBugPages}
                    style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* CREATE FUNCTIONAL REQUIREMENTS MODAL (JIRA STYLE) */}
      {showCreateFunctional && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '680px', width: '95%', maxHeight: '92vh', overflowY: 'auto', padding: '28px' }}>
            <button className="modal-close" onClick={() => { setShowCreateFunctional(false); setWorkTitleError(''); setProjectSelectError(''); }}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '6px', fontWeight: 800, fontSize: '1.6rem' }} className="gradient-text">Create Functional Requirements</h2>
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
                    onChange={(e) => setFunctionalWorkType(e.target.value)}
                  >
                    <option value="Epic">⚡ Epic</option>
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
                    <option value="pending">TO DO</option>
                    <option value="assigned">ASSIGNED</option>
                    <option value="reopened">REOPEN</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="waiting_customer">WAITING FOR CUSTOMER</option>
                    <option value="future_release">MOVED TO FUTURE RELEASE</option>
                    <option value="fixed">FIXED</option>
                    <option value="completed">RESOLVED</option>
                  </select>
                </div>
              </div>

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
                  <label htmlFor="funcAssignee" style={{ marginBottom: 0 }}>Assignee</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (user?.userId) {
                        setNewWorkAssignedId(user.userId);
                      } else {
                        toast.error('No logged-in user session found');
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Assign to me
                  </button>
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

                {/* Parent Selection */}
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
                    ).map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.workNumber} - {item.title} ({item.workType || 'Task'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date & Start Date Row */}
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

              {/* Labels & Team Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Labels */}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginTop: '12px', borderTop: '1px solid var(--border-soft)', paddingTop: '20px' }}>
                {/* Create Another Checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={createAnother}
                    onChange={(e) => setCreateAnother(e.target.checked)}
                    style={{
                      accentColor: 'var(--primary)',
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Create another</span>
                </label>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateFunctional(false); setWorkTitleError(''); setProjectSelectError(''); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={creatingWorkItem}>
                    {creatingWorkItem ? 'Creating...' : 'Create'}
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
