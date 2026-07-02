import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  api, BugDto, WorkItemDto, CommentDto, API_BASE_URL
} from '../services/api';
import { useAuth } from '../App';
import { toast } from '../services/toast';
import {
  Bug, ArrowLeft, CheckCircle2, Clock, AlertCircle,
  FileImage, MessageSquare, Send, Calendar, User,
  ExternalLink, Eye, Loader2
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  open: '#f43f5e',
  in_progress: '#f59e0b',
  fixed: '#22c55e',
  closed: '#6b7280',
};

export default function BugDetails() {
  const { bugId } = useParams<{ bugId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bug, setBug] = useState<BugDto | null>(null);
  const [workItem, setWorkItem] = useState<WorkItemDto | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const numBugId = Number(bugId);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const myBugsRes = await api.getMyBugs();
        if (myBugsRes.success) {
          const found = myBugsRes.data.find(b => b.id === numBugId);
          if (found) {
            setBug(found);
            const wiRes = await api.getWorkItemById(found.workItemId);
            if (wiRes.success) setWorkItem(wiRes.data);
            const cmtRes = await api.getCommentsByWorkItem(found.workItemId);
            if (cmtRes.success) setComments(cmtRes.data);
          } else {
            setError('Bug not found or not assigned to you.');
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load bug details');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [numBugId]);

  const handleStatusChange = async (status: string) => {
    if (!bug) return;
    setUpdatingStatus(true);
    try {
      const res = await api.updateBugStatus(bug.id, status);
      if (res.success) {
        setBug(prev => prev ? { ...prev, status: res.data.status, fixedAt: res.data.fixedAt, closedAt: res.data.closedAt } : prev);
        toast.success('Bug status updated!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !workItem) return;
    setSubmittingComment(true);
    try {
      const res = await api.addComment(workItem.id, newComment, false);
      if (res.success) {
        setComments(prev => [...prev, res.data]);
        setNewComment('');
        toast.success('Comment posted successfully!');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: 'var(--text-muted)' }}>
        <Loader2 className="animate-spin" size={24} />
        <span>Loading bug details...</span>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <AlertCircle size={40} color="#f43f5e" style={{ marginBottom: '12px' }} />
        <p style={{ color: '#f43f5e' }}>{error || 'Bug not found'}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: '16px' }}>Go Back</button>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[bug.status] || '#6b7280';

  const statusIcons: Record<string, React.ReactNode> = {
    open: <AlertCircle size={14} />,
    in_progress: <Clock size={14} />,
    fixed: <CheckCircle2 size={14} />,
    closed: <CheckCircle2 size={14} />,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate(-1)}
          style={{ padding: '8px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            width: '52px', height: '52px', flexShrink: 0,
            background: 'rgba(244,63,94,0.15)', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bug size={26} color="#f43f5e" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(244,63,94,0.15)', color: '#f43f5e',
                padding: '3px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700
              }}>{bug.bugNumber}</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: `${statusColor}20`, color: statusColor,
                padding: '3px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600
              }}>
                {statusIcons[bug.status]} {bug.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: '0 0 6px' }}>{bug.title}</h1>
            {bug.description && <p style={{ color: 'var(--text-muted)', margin: 0 }}>{bug.description}</p>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

        {/* LEFT: Parent Task + Screenshot + Comments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Parent Task Context */}
          {workItem && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <CheckCircle2 size={18} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>Parent Task — Understand What To Fix</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{workItem.workNumber}</div>
                  <div style={{ fontWeight: 600 }}>{workItem.title}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</div>
                  <div style={{ fontWeight: 600 }}>{workItem.projectName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{workItem.projectNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Status</div>
                  <span className={`badge badge-${workItem.status}`}>{workItem.status.replace('_', ' ')}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority</div>
                  <span className={`badge badge-${workItem.priority}`}>{workItem.priority}</span>
                </div>
              </div>
              {workItem.description && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '14px', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                  {workItem.description}
                </div>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/workitems/${workItem.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '7px 14px' }}
              >
                <ExternalLink size={14} /> Open Full Task Details
              </button>
            </div>
          )}

          {/* Bug Screenshot */}
          {bug.screenshotUrl && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <FileImage size={18} color="var(--primary)" />
                <span style={{ fontWeight: 700 }}>Bug Screenshot</span>
              </div>
              <div
                style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}
                onClick={() => {
                  const url = bug.screenshotUrl!.startsWith('http') ? bug.screenshotUrl! : `${API_BASE_URL}${bug.screenshotUrl}`;
                  setLightboxUrl(url);
                }}
              >
                <img
                  src={bug.screenshotUrl.startsWith('http') ? bug.screenshotUrl : `${API_BASE_URL}${bug.screenshotUrl}`}
                  alt="Bug screenshot"
                  style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-soft)' }}
                />
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'rgba(0,0,0,0.6)', borderRadius: '6px',
                  padding: '4px 8px', fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  <Eye size={12} /> Click to expand
                </div>
              </div>
            </div>
          )}

          {/* Discussion / Comments */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <MessageSquare size={18} color="var(--primary)" />
              <span style={{ fontWeight: 700 }}>Task Discussion ({comments.length})</span>
            </div>

            <form onSubmit={handleAddComment} style={{ marginBottom: '24px' }}>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Add a comment or progress update..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                required
                style={{ marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={submittingComment} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={15} />
                  {submittingComment ? 'Sending...' : 'Post Comment'}
                </button>
              </div>
            </form>

            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                <MessageSquare size={28} style={{ marginBottom: '8px' }} />
                <p>No comments yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {comments.map(c => (
                  <div key={c.id} style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    borderLeft: '3px solid var(--primary)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.postedBy}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.9rem' }}>{c.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR: Status + Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Status Update Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Bug size={18} color="#f43f5e" />
              <span style={{ fontWeight: 700 }}>Update Bug Status</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'open', label: 'Open', icon: <AlertCircle size={14} />, color: '#f43f5e' },
                { key: 'in_progress', label: 'In Progress', icon: <Clock size={14} />, color: '#f59e0b' },
                { key: 'fixed', label: 'Fixed', icon: <CheckCircle2 size={14} />, color: '#22c55e' },
                { key: 'closed', label: 'Closed', icon: <CheckCircle2 size={14} />, color: '#6b7280' },
              ].map(s => (
                <button
                  key={s.key}
                  disabled={updatingStatus || bug.status === s.key}
                  onClick={() => handleStatusChange(s.key)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${bug.status === s.key ? s.color : 'rgba(255,255,255,0.08)'}`,
                    background: bug.status === s.key ? `${s.color}20` : 'rgba(255,255,255,0.03)',
                    color: bug.status === s.key ? s.color : 'var(--text-muted)',
                    cursor: bug.status === s.key || updatingStatus ? 'default' : 'pointer',
                    fontWeight: bug.status === s.key ? 700 : 500,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '0.9rem', transition: 'all 0.2s',
                  }}
                >
                  <span style={{ color: s.color }}>{s.icon}</span>
                  {s.label}
                  {bug.status === s.key && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>← Current</span>}
                </button>
              ))}
            </div>
            {updatingStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Loader2 size={14} className="animate-spin" /> Updating...
              </div>
            )}
          </div>

          {/* Bug Meta */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ fontWeight: 700, marginBottom: '16px' }}>Bug Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <User size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-muted)' }}>Raised by:</span>
                <span style={{ fontWeight: 600 }}>{bug.raisedBy}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <User size={14} color="var(--primary)" />
                <span style={{ color: 'var(--text-muted)' }}>Assigned to:</span>
                <span style={{ fontWeight: 600 }}>{bug.assignedTo || 'You'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <Calendar size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-muted)' }}>Reported:</span>
                <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
              </div>
              {bug.fixedAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={14} color="#22c55e" />
                  <span style={{ color: 'var(--text-muted)' }}>Fixed:</span>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>{new Date(bug.fixedAt).toLocaleDateString()}</span>
                </div>
              )}
              {bug.closedAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={14} color="#6b7280" />
                  <span style={{ color: 'var(--text-muted)' }}>Closed:</span>
                  <span style={{ color: '#6b7280' }}>{new Date(bug.closedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Screenshot Lightbox */}
      {lightboxUrl && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'zoom-out' }}
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Screenshot" style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
        </div>
      )}
    </div>
  );
}
