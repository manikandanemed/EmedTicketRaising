import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Layers, Shield, User as UserIcon, AlertCircle, CheckCircle,
  Mail, Lock, Phone, ArrowRight
} from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [mobile, setMobile]     = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'ProductManager' | 'Employee'>('Employee');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = { name, email, password, mobile: mobile || null };
      const res = userType === 'Employee'
        ? await api.registerEmployee(payload)
        : await api.registerProductManager(payload);

      if (res.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Email might already be registered or connection issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-app)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(185,100%,50%,0.12), transparent 70%)',
        filter: 'blur(60px)', animation: 'orb-pulse 5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(204,90%,55%,0.10), transparent 70%)',
        filter: 'blur(60px)', animation: 'orb-pulse 5s ease-in-out infinite 2.5s',
        pointerEvents: 'none',
      }} />

      {/* Centered Card */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(100,180,255,0.12)',
        borderRadius: '24px',
        padding: '48px 44px',
        boxShadow: '0 24px 64px rgba(0,20,60,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
        animation: 'fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, var(--primary-dark), hsl(185,80%,40%))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 0 30px var(--primary-glow)',
            animation: 'float 4s ease-in-out infinite',
          }}>
            <Layers size={32} color="#fff" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--primary-hover) 0%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '6px',
          }}>
            Create account 🚀
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Join <strong style={{ color: 'var(--text-secondary)' }}>eMed Ticketing System</strong> and start tracking
          </p>
        </div>

        {/* Role Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Register as
          </p>
          <div className="role-toggle">
            <button
              type="button"
              className={`role-toggle-btn ${userType === 'Employee' ? 'active' : ''}`}
              onClick={() => setUserType('Employee')}
            >
              <UserIcon size={15} />
              Employee
            </button>
            <button
              type="button"
              className={`role-toggle-btn ${userType === 'ProductManager' ? 'active' : ''}`}
              onClick={() => setUserType('ProductManager')}
            >
              <Shield size={15} />
              Manager
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            marginBottom: '16px', fontSize: '0.88rem',
            border: '1px solid rgba(239,68,68,0.25)',
            animation: 'fadeIn 0.3s ease',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(52,211,153,0.1)', color: 'var(--success)',
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            marginBottom: '16px', fontSize: '0.88rem',
            border: '1px solid rgba(52,211,153,0.25)',
            animation: 'fadeIn 0.3s ease',
          }}>
            <CheckCircle size={16} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={16} style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                id="name" type="text" className="form-input"
                placeholder="John Doe" style={{ paddingLeft: '42px' }}
                value={name} onChange={e => setName(e.target.value)} required
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                id="email" type="email" className="form-input"
                placeholder="you@company.com" style={{ paddingLeft: '42px' }}
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>
          </div>

          {/* Mobile */}
          <div className="form-group">
            <label htmlFor="mobile">
              Mobile Number{' '}
              <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                id="mobile" type="text" className="form-input"
                placeholder="+91 9876543210" style={{ paddingLeft: '42px' }}
                value={mobile} onChange={e => setMobile(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                id="password" type="password" className="form-input"
                placeholder="Min 6 characters" style={{ paddingLeft: '42px' }}
                value={password} onChange={e => setPassword(e.target.value)} required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '13px', fontSize: '0.95rem', borderRadius: 'var(--radius-md)' }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block', width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                }} />
                Creating Account...
              </>
            ) : (
              <>Create Account <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div style={{
          textAlign: 'center', marginTop: '24px',
          fontSize: '0.88rem', color: 'var(--text-muted)',
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary-hover)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
