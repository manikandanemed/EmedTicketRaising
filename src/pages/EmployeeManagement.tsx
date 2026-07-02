import React, { useEffect, useState } from 'react';
import { api, EmployeeFullDto } from '../services/api';
import { toast } from '../services/toast';
import {
  Users, Mail, Phone, Calendar, UserX, KeyRound,
  CheckCircle, XCircle, Loader2, Search, Shield, Pencil
} from 'lucide-react';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<EmployeeFullDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState<EmployeeFullDto | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<EmployeeFullDto | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminNewEmail, setAdminNewEmail] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.getAllEmployeesFull();
      if (res.success) setEmployees(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleDeactivate = async () => {
    if (!confirmDeactivate) return;
    setDeactivating(true);
    try {
      const res = await api.deactivateEmployee(confirmDeactivate.id);
      if (res.success) {
        setEmployees(prev => prev.map(e => e.id === confirmDeactivate.id ? { ...e, isActive: false } : e));
        setConfirmDeactivate(null);
        toast.success('Employee deactivated successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate employee');
    } finally {
      setDeactivating(false);
    }
  };

  const handleAdminResetPassword = async () => {
    if (!resetPasswordUser || adminNewPassword.length < 6) return;
    setResetSaving(true);
    try {
      const res = await api.adminResetPassword(resetPasswordUser.id, adminNewPassword);
      if (res.success) {
        toast.success(`Password for ${resetPasswordUser.name} has been reset successfully!`);
        setAdminNewPassword('');
      } else {
        toast.error(res.message || 'Failed to reset password');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error resetting password');
    } finally {
      setResetSaving(false);
    }
  };

  const handleAdminUpdateEmail = async () => {
    if (!resetPasswordUser || !adminNewEmail.includes('@')) return;
    setEmailSaving(true);
    try {
      const res = await api.adminUpdateEmail(resetPasswordUser.id, adminNewEmail);
      if (res.success) {
        toast.success(`Email for ${resetPasswordUser.name} updated successfully!`);
        setEmployees(prev => prev.map(e => e.id === resetPasswordUser.id ? { ...e, email: adminNewEmail.trim().toLowerCase() } : e));
        setAdminNewEmail('');
      } else {
        toast.error(res.message || 'Failed to update email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating email');
    } finally {
      setEmailSaving(false);
    }
  };

  const active   = employees.filter(e => e.isActive);
  const inactive = employees.filter(e => !e.isActive);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="loading-center">
        <Loader2 className="spinner" size={28} color="var(--primary)" />
        <span>Loading employees...</span>
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Employee Management</h1>
          <p>Manage team members, access and credentials</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Employees', value: employees.length, color: 'var(--primary)', bg: 'rgba(14,165,233,0.12)', glow: 'var(--primary-glow)' },
          { label: 'Active',          value: active.length,    color: 'var(--success)',  bg: 'rgba(52,211,153,0.12)',  glow: 'var(--success-glow)' },
          { label: 'Deactivated',     value: inactive.length,  color: 'var(--danger)',   bg: 'rgba(239,68,68,0.12)',   glow: 'var(--danger-glow)' },
        ].map(k => (
          <div key={k.label} className="glass-panel" style={{ padding: '22px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)',
              color: k.color, marginBottom: '6px',
              textShadow: `0 0 20px ${k.glow}`
            }}>{k.value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</div>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', borderRadius: '50%', background: k.bg, filter: 'blur(20px)' }} />
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="search-filter-bar" style={{ marginBottom: '24px' }}>
        <div className="search-input-wrapper" style={{ maxWidth: '360px' }}>
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '42px' }}
          />
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '20px', color: 'var(--danger)', marginBottom: '20px', borderColor: 'rgba(239,68,68,0.25)' }}>
          {error}
        </div>
      )}

      {/* Employee Cards Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={28} /></div>
          <h3>{searchQuery ? 'No employees match your search.' : 'No employees registered yet.'}</h3>
          <p>Employees will appear here once they register.</p>
        </div>
      ) : (
        <div className="employee-grid">
          {filtered.map((emp, i) => (
            <div
              key={emp.id}
              className="glass-panel employee-card"
              style={{ animationDelay: `${i * 0.06}s`, opacity: emp.isActive ? 1 : 0.6 }}
            >
              {/* Card Header */}
              <div className="employee-card-header">
                <div
                  className="employee-card-avatar"
                  style={emp.isActive ? {} : { background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}
                >
                  {getInitials(emp.name)}
                </div>
                <div className="employee-card-info">
                  <div className="employee-card-name">{emp.name}</div>
                  <div className="employee-card-email">{emp.email}</div>
                </div>
                {/* Status dot */}
                <div style={{ flexShrink: 0 }}>
                  {emp.isActive ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '999px',
                      background: 'rgba(52,211,153,0.15)', color: 'var(--success)',
                      fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(52,211,153,0.3)'
                    }}>
                      <CheckCircle size={11} /> Active
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '999px',
                      background: 'rgba(239,68,68,0.12)', color: 'var(--danger)',
                      fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(239,68,68,0.25)'
                    }}>
                      <XCircle size={11} /> Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Info rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="info-row">
                  <Mail size={13} />
                  <span style={{ fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</span>
                </div>
                <div className="info-row">
                  <Phone size={13} />
                  <span style={{ fontSize: '0.83rem' }}>{emp.mobile || '—'}</span>
                </div>
                <div className="info-row">
                  <Calendar size={13} />
                  <span style={{ fontSize: '0.83rem' }}>Joined {new Date(emp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="employee-card-footer">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  #{emp.id}
                </span>
                {emp.isActive && (
                  <div className="employee-card-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setResetPasswordUser(emp)}
                      style={{ padding: '7px 12px', fontSize: '0.78rem', gap: '5px' }}
                      title="Reset Password"
                    >
                      <KeyRound size={13} />
                      Reset
                    </button>
                    <button
                      className="btn"
                      onClick={() => setConfirmDeactivate(emp)}
                      style={{
                        padding: '7px 12px', fontSize: '0.78rem', gap: '5px',
                        background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                        border: '1px solid rgba(239,68,68,0.25)'
                      }}
                      title="Deactivate"
                    >
                      <UserX size={13} />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Deactivate Confirm Modal ─────────────── */}
      {confirmDeactivate && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(239,68,68,0.3)'
              }}>
                <UserX size={28} color="var(--danger)" />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Remove Employee?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{confirmDeactivate.name}</strong> will be deactivated and cannot login anymore. Their task history will be preserved.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDeactivate(null)} style={{ flex: 1 }} disabled={deactivating}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeactivate} disabled={deactivating} style={{ flex: 1, gap: '8px' }}>
                {deactivating ? 'Removing...' : <><UserX size={15} /> Remove</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Credentials Modal ─────────────── */}
      {resetPasswordUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(14,165,233,0.15)', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(14,165,233,0.3)'
              }}>
                <KeyRound size={28} color="var(--primary-hover)" />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Reset Credentials</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Update email or password for <strong style={{ color: 'var(--text-primary)' }}>{resetPasswordUser.name}</strong>
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                marginTop: '8px', padding: '4px 12px', borderRadius: '999px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.78rem', color: 'var(--text-muted)'
              }}>
                <Mail size={12} /> Current: {resetPasswordUser.email}
              </div>
            </div>

            {/* Email update section */}
            <div style={{
              background: 'rgba(14,165,233,0.06)', borderRadius: '12px',
              border: '1px solid rgba(14,165,233,0.15)', padding: '16px', marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Mail size={14} color="var(--primary)" />
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--primary)' }}>Update Email</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  id="adminNewEmail"
                  type="email"
                  className="form-input"
                  placeholder="Enter new email address"
                  value={adminNewEmail}
                  onChange={e => setAdminNewEmail(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAdminUpdateEmail}
                  disabled={emailSaving || !adminNewEmail.includes('@')}
                  style={{ padding: '10px 16px', whiteSpace: 'nowrap', gap: '6px' }}
                >
                  {emailSaving ? <Loader2 size={14} className="spinner" /> : <Pencil size={14} />}
                  {emailSaving ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>

            {/* Password reset section */}
            <div style={{
              background: 'rgba(139,92,246,0.06)', borderRadius: '12px',
              border: '1px solid rgba(139,92,246,0.15)', padding: '16px', marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <KeyRound size={14} color="var(--accent)" />
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--accent)' }}>Reset Password</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  id="adminNewPassword"
                  type="password"
                  className="form-input"
                  placeholder="Min. 6 characters"
                  value={adminNewPassword}
                  onChange={e => setAdminNewPassword(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAdminResetPassword}
                  disabled={resetSaving || adminNewPassword.length < 6}
                  style={{ padding: '10px 16px', whiteSpace: 'nowrap', gap: '6px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
                >
                  {resetSaving ? <Loader2 size={14} className="spinner" /> : <KeyRound size={14} />}
                  {resetSaving ? 'Saving...' : 'Reset'}
                </button>
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => { setResetPasswordUser(null); setAdminNewPassword(''); setAdminNewEmail(''); }}
              style={{ width: '100%' }}
              disabled={resetSaving || emailSaving}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
