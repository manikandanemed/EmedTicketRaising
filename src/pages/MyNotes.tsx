import React, { useEffect, useState } from 'react';
import { api, PersonalNoteDto, EmployeeDropdownDto } from '../services/api';
import { toast } from '../services/toast';
import { FileText, Calendar, Trash2, PlusCircle, Filter, RotateCcw, AlertCircle, Edit2, User } from 'lucide-react';
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
      <div className="page-header">
        <div>
          <h1>My Notes & Diary</h1>
          <p style={{ color: 'var(--text-muted)' }}>Write and manage your daily personal notes, reminders, or standup updates.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '30px', alignItems: 'start' }}>
        {/* Left Column: Add Note Form */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlusCircle size={20} className="gradient-text" />
            <span>{editingNoteId !== null ? 'Edit Note' : 'Add New Note'}</span>
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

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving || !content.trim()}>
                {saving ? 'Saving...' : editingNoteId !== null ? 'Update Note' : 'Save Note'}
              </button>
              {editingNoteId !== null && (
                <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Filter & Notes List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Filter Bar */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Filter size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Filter by Date</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="date"
                className="form-input"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ width: '180px', padding: '6px 12px' }}
              />
              {filterDate && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => setFilterDate('')}
                  style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                  title="Clear Filter"
                >
                  <RotateCcw size={14} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Notes Log */}
          <div className="glass-panel" style={{ padding: '30px', minHeight: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} className="gradient-text" />
              <span>Notes History</span>
            </h3>

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
                color: 'var(--text-muted)',
                gap: '12px',
                padding: '40px 0'
              }}>
                <FileText size={40} style={{ color: 'var(--text-disabled)' }} />
                <p style={{ margin: 0, fontSize: '0.95rem', textAlign: 'center' }}>
                  {filterDate ? `No notes found for ${new Date(filterDate).toLocaleDateString()}` : 'No notes logged yet. Write your first note on the left!'}
                </p>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
