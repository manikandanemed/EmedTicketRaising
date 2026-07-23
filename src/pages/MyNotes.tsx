import React, { useEffect, useState } from 'react';
import { api, PersonalNoteDto, EmployeeDropdownDto } from '../services/api';
import { toast } from '../services/toast';
import { FileText, Calendar, Trash2, PlusCircle, Filter, RotateCcw, AlertCircle, Edit2, User, Send, Clipboard } from 'lucide-react';
import { useAuth } from '../App';

export default function MyNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<PersonalNoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [content, setContent] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState('medium');
  const [assignedToUserId, setAssignedToUserId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  // Filter State
  const [filterDate, setFilterDate] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  // Active employees list
  const [employees, setEmployees] = useState<EmployeeDropdownDto[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.getEmployeesDropdown();
        if (res.success) setEmployees(res.data);
      } catch (err) {}
    };
    fetchEmployees();
  }, []);

  const handleStartEdit = (note: PersonalNoteDto) => {
    setEditingNoteId(note.id);
    setContent(note.content);
    setNoteDate(note.noteDate.split('T')[0]);
    setPriority(note.priority);
    setAssignedToUserId(note.assignedToUserId || '');
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setContent('');
    setNoteDate(new Date().toISOString().split('T')[0]);
    setPriority('medium');
    setAssignedToUserId('');
  };

  const fetchNotes = async (dateStr?: string) => {
    setLoading(true);
    try {
      const res = await api.getPersonalNotes(dateStr);
      if (res.success) {
        setNotes(res.data);
        setError('');
      } else {
        setError(res.message || 'Failed to fetch notes');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(filterDate || undefined);
  }, [filterDate]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    const assignedIdVal = assignedToUserId === '' ? null : Number(assignedToUserId);
    try {
      if (editingNoteId !== null) {
        // Update
        const res = await api.updatePersonalNote(editingNoteId, content, noteDate, priority, assignedIdVal);
        if (res.success) {
          handleCancelEdit();
          fetchNotes(filterDate || undefined);
          toast.success('Note updated successfully!');
        } else {
          toast.error(res.message || 'Failed to update note');
        }
      } else {
        // Create
        const res = await api.createPersonalNote(content, noteDate, priority, assignedIdVal);
        if (res.success) {
          setContent('');
          setNoteDate(new Date().toISOString().split('T')[0]);
          setPriority('medium');
          setAssignedToUserId('');
          fetchNotes(filterDate || undefined);
          toast.success('Note saved successfully!');
        } else {
          toast.error(res.message || 'Failed to save note');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving note');
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteNote = async (id: number) => {
    try {
      const res = await api.deletePersonalNote(id);
      if (res.success) {
        setNotes(prev => prev.filter(n => n.id !== id));
        toast.success('Note deleted successfully!');
      } else {
        toast.error(res.message || 'Failed to delete note');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting note');
    } finally {
      setNoteToDelete(null);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#0F172A', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.2rem' }}>My Notes & Diary</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Write and manage your daily personal notes, reminders, or standup updates.</p>
        </div>
        
        {/* Background Graphic SVG */}
        <div style={{ position: 'absolute', right: 0, top: '-20px', pointerEvents: 'none', opacity: 0.9 }}>
          <svg width="240" height="120" viewBox="0 0 240 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="130" y="25" width="70" height="90" rx="8" fill="#E0E7FF" transform="rotate(12 130 25)" />
            <rect x="145" y="15" width="70" height="90" rx="8" fill="#F0EDFF" transform="rotate(-6 145 15)" />
            <rect x="160" y="10" width="60" height="85" rx="6" fill="#FFFFFF" stroke="var(--primary)" strokeWidth="3" />
            <line x1="170" y1="25" x2="210" y2="25" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
            <line x1="170" y1="40" x2="210" y2="40" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
            <line x1="170" y1="55" x2="210" y2="55" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
            <line x1="170" y1="70" x2="190" y2="70" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
            <path d="M220 35 L200 85 L195 90 L197 83 L225 37 Z" fill="var(--primary)" />
            <circle cx="165" cy="10" r="4" fill="var(--primary)" />
            <circle cx="185" cy="10" r="4" fill="var(--primary)" />
            <circle cx="205" cy="10" r="4" fill="var(--primary)" />
            <path d="M120 100 Q 130 90 140 105" stroke="#E0E7FF" strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="110" cy="95" r="2" fill="#E0E7FF" />
            <circle cx="100" cy="105" r="1.5" fill="#E0E7FF" />
            <circle cx="190" cy="5" r="1" fill="#C7D2FE" />
          </svg>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px', alignItems: 'start' }}>
        {/* Left Column: Add Note Form */}
        <div className="glass-panel" style={{ padding: '30px', minWidth: 0 }}>
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlusCircle size={20} style={{ color: 'var(--primary)', fill: 'var(--primary)', stroke: '#fff' }} />
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{editingNoteId !== null ? 'Edit Note' : 'Add New Note'}</span>
          </h3>

          <form onSubmit={handleSaveNote} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label htmlFor="noteDate">Note Date</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input
                  id="noteDate"
                  type="date"
                  className="form-input"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                className="form-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              >
                <option value="low" style={{ background: 'var(--bg-app)' }}>Low 🟢</option>
                <option value="medium" style={{ background: 'var(--bg-app)' }}>Medium 🔵</option>
                <option value="high" style={{ background: 'var(--bg-app)' }}>High 🟠</option>
                <option value="critical" style={{ background: 'var(--bg-app)' }}>Critical 🔴</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="assignTo">Assign To</label>
              <select
                id="assignTo"
                className="form-input"
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
              >
                <option value="" style={{ background: 'var(--bg-app)' }}>-- Keep Personal (No Assignment) --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id} style={{ background: 'var(--bg-app)' }}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="content">Content</label>
              <textarea
                id="content"
                className="form-textarea"
                rows={6}
                placeholder="What did you work on today? Any blockers or plans for tomorrow?..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '10px 24px', background: '#FFFFFF' }}
                onClick={() => {
                  if (editingNoteId !== null) {
                    handleCancelEdit();
                  } else {
                    setContent(''); setNoteDate(new Date().toISOString().split('T')[0]); setPriority('medium'); setAssignedToUserId('');
                  }
                }}
              >
                {editingNoteId !== null ? 'Cancel' : 'Clear'}
              </button>
              
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }} disabled={saving || !content.trim()}>
                <Send size={18} />
                {saving ? 'Saving...' : editingNoteId !== null ? 'Update Note' : 'Save Note'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Filter & Notes List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
          {/* Filter Bar */}
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Filter size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0F172A' }}>Filter by Date</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="date"
                className="form-input"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ width: '160px', padding: '8px 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}
              />
              {filterDate && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => setFilterDate('')}
                  style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Clear Filter"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Notes Log */}
          <div className="glass-panel" style={{ padding: '30px', minHeight: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: '#0F172A' }} />
                <span style={{ color: '#0F172A', fontWeight: 700 }}>Notes History</span>
              </h3>
              <span className="badge" style={{ background: '#F0EDFF', color: 'var(--primary)', padding: '6px 12px', borderRadius: '20px', fontWeight: 600, fontSize: '0.8rem' }}>
                {notes.length} Notes
              </span>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading notes...</p>
            ) : error ? (
              <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            ) : notes.length === 0 ? (
              <div style={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                border: '1.5px dashed var(--border-soft)',
                borderRadius: '16px',
                backgroundColor: '#FAFCFD',
                padding: '60px 20px',
                gap: '16px'
              }}>
                <div style={{ position: 'relative' }}>
                  <Clipboard size={64} style={{ color: '#C7D2FE' }} strokeWidth={1.5} />
                  <div style={{ position: 'absolute', top: -10, right: -15, color: '#A5B4FC', fontSize: '1.2rem' }}>✦</div>
                  <div style={{ position: 'absolute', bottom: 5, left: -15, color: '#A5B4FC', fontSize: '1.2rem' }}>●</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                    {filterDate ? 'No notes found for this date' : 'No notes logged yet.'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    {filterDate ? 'Try clearing the filter or picking another day.' : 'Write your first note on the left!'}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {notes.map((note) => (
                  <div 
                    key={note.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '20px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-soft)',
                      position: 'relative'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-testing" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                          <Calendar size={12} />
                          {new Date(note.noteDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`badge badge-${note.priority.toLowerCase()}`} style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>
                          {note.priority}
                        </span>
                        {note.assignedToUserName && (
                          <span className="badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <User size={12} />
                            Assign To: {note.assignedToUserName}
                          </span>
                        )}
                        {note.creatorUserName && (
                          <span className="badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <User size={12} />
                            From: {note.creatorUserId === user?.userId ? 'Me' : note.creatorUserName}
                          </span>
                        )}
                      </div>

                      {note.creatorUserId === user?.userId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => handleStartEdit(note)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'color 0.2s, background-color 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'var(--primary-glow)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            title="Edit Note"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button 
                            onClick={() => setNoteToDelete(note.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'color 0.2s, background-color 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.backgroundColor = 'var(--danger-glow)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            title="Delete Note"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <p style={{
                      margin: 0,
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                      lineHeight: 1.6, 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {note.content}
                    </p>

                    {/* Footer Date Logged */}
                    <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      Logged on: {new Date(note.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {noteToDelete !== null && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--danger)' }}>
              <AlertCircle size={48} />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontWeight: 700 }}>Delete Note?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setNoteToDelete(null)}
                style={{ padding: '8px 20px' }}
              >
                Cancel
              </button>
              <button 
                className="btn" 
                onClick={() => executeDeleteNote(noteToDelete)}
                style={{ 
                  padding: '8px 20px', 
                  background: 'rgba(239, 68, 68, 0.2)', 
                  color: '#ef4444', 
                  border: '1px solid rgba(239, 68, 68, 0.4)' 
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
