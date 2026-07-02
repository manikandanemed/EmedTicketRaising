import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  api, 
  WorkItemDto, 
  BugDto, 
  CommentDto, 
  EmployeeDropdownDto,
  API_BASE_URL
} from '../services/api';
import { useAuth } from '../App';
import { toast } from '../services/toast';
import { 
  CheckSquare, 
  CheckCircle2,
  Bug, 
  MessageSquare, 
  User, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Lock, 
  Send,
  Plus,
  X,
  FileImage,
  Loader2,
  ChevronDown,
  RefreshCw,
  PlusCircle,
  Eye
} from 'lucide-react';

export default function WorkItemDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const workItemId = Number(id);
  const isPM = user?.userType === 'ProductManager';

  // Details state
  const [workItem, setWorkItem] = useState<WorkItemDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dropdown list for reassignment
  const [employees, setEmployees] = useState<EmployeeDropdownDto[]>([]);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'comments' | 'bugs'>('comments');

  // Comments state
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Bugs state
  const [bugs, setBugs] = useState<BugDto[]>([]);
  const [showRaiseBug, setShowRaiseBug] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugAssignedId, setBugAssignedId] = useState<number | ''>('');
  const [bugScreenshot, setBugScreenshot] = useState<File | null>(null);
  const [bugScreenshotPreview, setBugScreenshotPreview] = useState<string | null>(null);
  const [submittingBug, setSubmittingBug] = useState(false);
  const [bugTitleError, setBugTitleError] = useState('');

  // Bug Lightbox
  const [activeScreenshotUrl, setActiveScreenshotUrl] = useState<string | null>(null);

  // Action states
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [dueDateInput, setDueDateInput] = useState('');
  const [updatingDueDate, setUpdatingDueDate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getWorkItemById(workItemId);
      if (res.success) {
        setWorkItem(res.data);
      } else {
        setError(res.message || 'Work Item not found');
      }

      // Load comments & bugs in parallel
      const [commentsRes, bugsRes] = await Promise.all([
        api.getCommentsByWorkItem(workItemId),
        api.getBugsByWorkItem(workItemId)
      ]);

      if (commentsRes.success) setComments(commentsRes.data);
      if (bugsRes.success) setBugs(bugsRes.data);

      const empRes = await api.getEmployeesDropdown();
      if (empRes.success) setEmployees(empRes.data);
    } catch (err: any) {
      setError(err.message || 'Error loading details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workItemId) {
      loadData();
    }
  }, [workItemId]);

  useEffect(() => {
    if (workItem && workItem.dueDate) {
      setDueDateInput(workItem.dueDate.split('T')[0]);
    } else {
      setDueDateInput('');
    }
  }, [workItem]);

  const handleDueDateUpdate = async () => {
    if (!workItem) return;
    setUpdatingDueDate(true);
    try {
      const res = await api.updateWorkItemDueDate(workItem.id, dueDateInput ? new Date(dueDateInput).toISOString() : null);
      if (res.success) {
        setWorkItem(res.data);
        toast.success('Due date updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update due date');
    } finally {
      setUpdatingDueDate(false);
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    if (!workItem) return;

    setUpdatingStatus(true);
    try {
      const res = await api.updateWorkItemStatus(workItem.id, status);
      if (res.success) {
        setWorkItem(res.data);
        toast.success('Status updated successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!workItem) return;

    const assignedId = val === '' ? null : Number(val);
    setUpdatingAssignee(true);
    try {
      const res = await api.reassignWorkItem(workItem.id, assignedId);
      if (res.success) {
        setWorkItem(res.data);
        toast.success('Task assignee updated!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reassign task');
    } finally {
      setUpdatingAssignee(false);
    }
  };

  // Employee self-assign
  const handleSelfAssign = async () => {
    if (!workItem || !user) return;
    setUpdatingAssignee(true);
    try {
      const res = await api.reassignWorkItem(workItem.id, user.userId);
      if (res.success) {
        setWorkItem(res.data);
        toast.success('Task assigned to you!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign task');
    } finally {
      setUpdatingAssignee(false);
    }
  };

  // Employee self-unassign
  const handleSelfUnassign = async () => {
    if (!workItem) return;
    setUpdatingAssignee(true);
    try {
      const res = await api.reassignWorkItem(workItem.id, null);
      if (res.success) {
        setWorkItem(res.data);
        toast.success('Task unassigned successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to unassign task');
    } finally {
      setUpdatingAssignee(false);
    }
  };

  // Comments submit
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !workItem) return;

    setSubmittingComment(true);
    try {
      const res = await api.addComment(workItem.id, newComment, isInternalComment);
      if (res.success) {
        setComments([...comments, res.data]);
        setNewComment('');
        setIsInternalComment(false);
        toast.success('Comment posted successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Screenshot select
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBugScreenshot(file);
      setBugScreenshotPreview(URL.createObjectURL(file));
    }
  };

  // Raise Bug submit
  const handleRaiseBug = async (e: React.FormEvent) => {
    e.preventDefault();
    setBugTitleError('');

    if (!bugTitle.trim()) {
      setBugTitleError('Bug Title is required');
      return;
    }

    if (!workItem) return;

    setSubmittingBug(true);
    try {
      const formData = new FormData();
      formData.append('Title', bugTitle);
      formData.append('Description', bugDesc || '');
      formData.append('WorkItemId', String(workItem.id));
      if (bugAssignedId !== '') {
        formData.append('AssignedToUserId', String(bugAssignedId));
      }
      if (bugScreenshot) {
        formData.append('screenshot', bugScreenshot);
      }

      const res = await api.createBug(formData);
      if (res.success) {
        setBugs([res.data, ...bugs]);
        setShowRaiseBug(false);
        setBugTitle('');
        setBugDesc('');
        setBugAssignedId('');
        setBugScreenshot(null);
        setBugScreenshotPreview(null);
        setBugTitleError('');
        toast.success('Bug reported successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to report bug');
    } finally {
      setSubmittingBug(false);
    }
  };

  // Update Bug Status
  const handleBugStatusChange = async (bugId: number, status: string) => {
    try {
      const res = await api.updateBugStatus(bugId, status);
      if (res.success) {
        setBugs(bugs.map(b => b.id === bugId ? { ...b, status: res.data.status, fixedAt: res.data.fixedAt, closedAt: res.data.closedAt } : b));
        toast.success('Bug status updated!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update bug status');
    }
  };

  // Reassign Bug
  const handleBugReassign = async (bugId: number, val: string) => {
    const assignedId = val === '' ? null : Number(val);
    try {
      const res = await api.reassignBug(bugId, assignedId);
      if (res.success) {
        setBugs(bugs.map(b => b.id === bugId ? { ...b, assignedTo: res.data.assignedTo } : b));
        toast.success('Bug assignee updated!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reassign bug');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: '12px',
        color: 'var(--text-muted)'
      }}>
        <Loader2 className="animate-spin" size={24} />
        <span>Loading item details...</span>
      </div>
    );
  }

  if (error || !workItem) {
    return (
      <div className="glass-panel" style={{
        padding: '30px',
        color: 'var(--danger)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: '1px solid rgba(250, 50, 50, 0.2)'
      }}>
        <AlertCircle size={24} />
        <div>
          <h3>Error loading Work Item</h3>
          <p>{error || 'No details returned.'}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginTop: '12px' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate(-1)}
          style={{ padding: '8px 16px' }}
        >
          ← Go Back
        </button>
      </div>

      {/* Main Work Item Info Panel */}
      <div className="glass-panel" style={{ padding: '30px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          
          {/* Main Info */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="badge badge-testing" style={{ fontSize: '0.8rem' }}>{workItem.workNumber}</span>
              <span className={`badge badge-${workItem.priority}`}>{workItem.priority}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Project: <strong>{workItem.projectName}</strong></span>
              {workItem.clientName && <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>| Client: <strong>{workItem.clientName}</strong></span>}
              {workItem.productName && <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>| Product: <strong>{workItem.productName}</strong></span>}
              {workItem.moduleName && <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>| Module: <strong>{workItem.moduleName}</strong></span>}
            </div>
            
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '16px' }}>{workItem.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
              {workItem.description || 'No description provided.'}
            </p>

            {/* Attachments Section */}
            {workItem.attachmentUrls && (
              <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-soft)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                  Attachments
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {workItem.attachmentUrls.split(',').filter(Boolean).map((url, idx) => {
                    const fileName = url.substring(url.lastIndexOf('/') + 1);
                    return (
                      <a
                        key={idx}
                        href={`${API_BASE_URL}${url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-soft)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '0.82rem',
                          color: '#38bdf8',
                          textDecoration: 'none',
                          fontWeight: 500,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                      >
                        <span>📎</span>
                        <span>{fileName.length > 25 ? fileName.substring(0, 22) + '...' : fileName}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', borderTop: '1px solid var(--border-soft)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <User size={16} />
                <span>Created By: <strong>{workItem.createdBy}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <Calendar size={16} />
                <span>Created: <strong>{new Date(workItem.createdAt).toLocaleDateString()}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Pane */}
          <div style={{
            width: '280px',
            background: 'rgba(0,0,0,0.2)',
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-soft)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Status Update */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Work Status</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="form-select" 
                  value={workItem.status} 
                  onChange={handleStatusChange}
                  disabled={updatingStatus}
                  style={{ paddingRight: '30px' }}
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
                {updatingStatus && (
                  <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '10px', top: '14px', color: 'var(--primary)' }} />
                )}
              </div>
            </div>

            {/* Assigned To */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Assigned To</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="form-select" 
                  value={workItem.assignedTo ? employees.find(e => e.name === workItem.assignedTo)?.id || '' : ''} 
                  onChange={handleAssigneeChange}
                  disabled={updatingAssignee}
                >
                  <option value="">-- Unassigned --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                {updatingAssignee && (
                  <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '10px', top: '14px', color: 'var(--primary)' }} />
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Due Date</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="date"
                  className="form-input"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                  disabled={updatingDueDate}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDueDateUpdate}
                  disabled={updatingDueDate}
                  style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tabs list */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} />
            <span>Comments & Discussions ({comments.length})</span>
          </div>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bugs' ? 'active' : ''}`}
          onClick={() => setActiveTab('bugs')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bug size={16} />
            <span>Reported Bugs ({bugs.length})</span>
          </div>
        </button>
      </div>

      {/* TAB 1: COMMENTS */}
      {activeTab === 'comments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
          {/* Post Comment Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <form onSubmit={handleAddComment}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Ask a question or provide progress updates..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* PM Internal Comments Toggle */}
                {isPM ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      checked={isInternalComment} 
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      style={{
                        accentColor: 'var(--secondary)',
                        width: '16px',
                        height: '16px'
                      }}
                    />
                    <span style={{ color: 'var(--secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={14} /> Internal Discussion (PM Only)
                    </span>
                  </label>
                ) : <div />}

                <button type="submit" className="btn btn-primary" disabled={submittingComment}>
                  <Send size={16} />
                  {submittingComment ? 'Sending...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>

          {/* Comments List */}
          <div className="comments-list">
            {comments.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                No comments posted yet.
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className={`comment-card ${comment.isInternal ? 'internal' : ''}`}>
                  <div className="comment-meta">
                    <span className="comment-user">
                      {comment.postedBy} 
                      {comment.isInternal && (
                        <span className="badge badge-bug_found" style={{ marginLeft: '10px', fontSize: '0.65rem', verticalAlign: 'middle' }}>
                          Internal
                        </span>
                      )}
                    </span>
                    <span>{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="comment-text">{comment.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BUGS */}
      {activeTab === 'bugs' && (
        <div>
          {/* Action Row */}
          {!isPM && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <button className="btn btn-danger" onClick={() => setShowRaiseBug(true)}>
                <Plus size={18} />
                Report a Bug
              </button>
            </div>
          )}

          {/* Bugs List */}
          {bugs.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)', marginBottom: '12px' }} />
              <p>Hurray! No bugs logged for this task.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {bugs.map((bug) => (
                <div key={bug.id} className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span className="badge badge-bug_found" style={{ fontWeight: 700 }}>{bug.bugNumber}</span>
                        <span className={`badge badge-${bug.status}`}>{bug.status}</span>
                      </div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>{bug.title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '12px' }}>{bug.description}</p>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span>Reported by: <strong>{bug.raisedBy}</strong></span>
                        <span>Date: <strong>{new Date(bug.createdAt).toLocaleDateString()}</strong></span>
                        {bug.fixedAt && <span style={{ color: 'var(--success)' }}>Fixed at: <strong>{new Date(bug.fixedAt).toLocaleDateString()}</strong></span>}
                      </div>
                    </div>

                    {/* Screenshot thumbnail */}
                    {bug.screenshotUrl && (
                      <div 
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={() => {
                          const url = bug.screenshotUrl!.startsWith('http') ? bug.screenshotUrl! : `${API_BASE_URL}${bug.screenshotUrl}`;
                          setActiveScreenshotUrl(url);
                        }}
                      >
                        <img 
                          src={bug.screenshotUrl.startsWith('http') ? bug.screenshotUrl : `${API_BASE_URL}${bug.screenshotUrl}`} 
                          alt="Bug screenshot" 
                          style={{
                            width: '120px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-soft)'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: 'rgba(0,0,0,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--radius-sm)',
                          opacity: 0,
                          transition: 'opacity 0.2s'
                        }}
                        className="hover-overlay"
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                        >
                          <Eye size={18} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions for Employees or PMs on this Bug */}
                  <div style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-soft)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '15px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Reassign Bug */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assigned to:</label>
                      {isPM ? (
                        <select
                          className="form-select"
                          style={{ padding: '6px 12px', fontSize: '0.85rem', width: '160px' }}
                          value={bug.assignedTo ? employees.find(e => e.name === bug.assignedTo)?.id || '' : ''}
                          onChange={(e) => handleBugReassign(bug.id, e.target.value)}
                        >
                          <option value="">-- Unassigned --</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{bug.assignedTo || 'Unassigned'}</span>
                      )}
                    </div>

                    {/* Change Bug Status (Only available to Employee / PM) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</label>
                      <select
                        className="form-select"
                        style={{ padding: '6px 12px', fontSize: '0.85rem', width: '140px' }}
                        value={bug.status}
                        onChange={(e) => handleBugStatusChange(bug.id, e.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="fixed">Fixed</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {activeScreenshotUrl && (
        <div className="modal-overlay" onClick={() => setActiveScreenshotUrl(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setActiveScreenshotUrl(null)} 
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              <X size={20} /> Close
            </button>
            <img 
              src={activeScreenshotUrl} 
              alt="Screenshot Preview Large" 
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                border: '1px solid var(--border-soft)'
              }}
            />
          </div>
        </div>
      )}

      {/* RAISE BUG MODAL */}
      {showRaiseBug && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => { setShowRaiseBug(false); setBugTitleError(''); }}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '24px', fontWeight: 800 }} className="gradient-text">Log a Bug</h2>
            
            <form onSubmit={handleRaiseBug} noValidate>
              <div className="form-group">
                <label htmlFor="bugTitle">Bug Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="bugTitle"
                  type="text"
                  className="form-input"
                  placeholder="e.g. App crashes when resizing"
                  value={bugTitle}
                  onChange={(e) => {
                    setBugTitle(e.target.value);
                    if (e.target.value.trim()) setBugTitleError('');
                  }}
                  style={bugTitleError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)' } : {}}
                />
                {bugTitleError && (
                  <div style={{
                    color: 'var(--danger)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <span style={{ fontSize: '0.9rem', lineHeight: 0 }}>♦</span>
                    <span>{bugTitleError}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="bugDesc">Steps to Reproduce</label>
                <textarea
                  id="bugDesc"
                  className="form-textarea"
                  rows={3}
                  placeholder="Describe step-by-step how to trigger..."
                  value={bugDesc}
                  onChange={(e) => setBugDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bugAssign">Assign To</label>
                <select
                  id="bugAssign"
                  className="form-select"
                  value={bugAssignedId}
                  onChange={(e) => setBugAssignedId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">-- Unassigned --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Screenshot Selector */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Screenshot Upload</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleScreenshotChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                
                <div 
                  className="file-upload-btn" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage size={32} style={{ margin: '0 auto 10px auto', display: 'block', color: 'var(--primary)' }} />
                  {bugScreenshot ? (
                    <span style={{ color: '#fff', fontWeight: 600 }}>{bugScreenshot.name}</span>
                  ) : (
                    <span>Click here to select an image file</span>
                  )}
                </div>

                {bugScreenshotPreview && (
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <img 
                      src={bugScreenshotPreview} 
                      alt="Upload Preview" 
                      className="screenshot-preview"
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowRaiseBug(false); setBugTitleError(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={submittingBug}>
                  {submittingBug ? 'Submitting...' : 'Log Bug'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
