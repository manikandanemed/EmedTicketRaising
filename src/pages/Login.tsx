import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../services/api';
import { toast } from '../services/toast';
import {
  Layers, Shield, User as UserIcon, AlertCircle,
  Lock, Mail, ArrowRight
} from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'ProductManager' | 'Employee'>('Employee');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!showOtp) {
        const res = await api.login({ userName: email, password });
        if (res.success && res.data?.otpRequired) {
          setShowOtp(true);
          const roles = res.data.roles || res.data.Roles || [];
          setAvailableRoles(roles);
          if (roles.length > 0) {
            setUserType(roles[0]);
          }
          toast.success(res.message || 'OTP sent to your email');
        } else if (res.success) {
          login(res.data);
          navigate('/');
        } else {
          setError(res.message || 'Login failed');
        }
      } else {
        const res = await api.verifyOtp({ userName: email, otp, userType });
        if (res.success) {
          login(res.data);
          navigate('/');
          toast.success('Logged in successfully');
        } else {
          setError(res.message || 'Verification failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or connection issue');
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
        position: 'absolute', top: '-120px', left: '-120px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(204,90%,55%,0.12), transparent 70%)',
        filter: 'blur(60px)', animation: 'orb-pulse 5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(185,100%,50%,0.10), transparent 70%)',
        filter: 'blur(60px)', animation: 'orb-pulse 5s ease-in-out infinite 2s',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '40%', left: '60%',
        width: '280px', height: '280px', borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(174,72%,52%,0.08), transparent 70%)',
        filter: 'blur(50px)', animation: 'orb-pulse 5s ease-in-out infinite 1s',
        pointerEvents: 'none',
      }} />

      {/* Centered Card */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
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
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
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
            Welcome back 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Sign in to continue to <strong style={{ color: 'var(--text-secondary)' }}>eMed Ticketing System</strong>
          </p>
        </div>

        {/* Role toggle has been moved to the OTP verification screen dynamically */}

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            marginBottom: '20px', fontSize: '0.88rem',
            border: '1px solid rgba(239,68,68,0.25)',
            animation: 'fadeIn 0.3s ease',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!showOtp ? (
            <>
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
                    placeholder="you@company.com"
                    style={{ paddingLeft: '42px' }}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
                  }} />
                  <input
                    id="password" type="password" className="form-input"
                    placeholder="••••••••"
                    style={{ paddingLeft: '42px' }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Forgot */}
              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => toast.info('Please contact your Product Manager to reset your password.')}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--primary-hover)', fontSize: '0.8rem',
                    cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            </>
          ) : (
            <>
              {/* OTP Message */}
              <div style={{
                background: 'rgba(100,180,255,0.06)',
                border: '1px solid rgba(100,180,255,0.15)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px',
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4
              }}>
                An OTP has been sent to your email <strong>{email}</strong>. Please check your inbox and enter the 6-digit code.
              </div>

              {/* OTP Code */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label htmlFor="otp">Enter Verification Code</label>
                <div style={{ position: 'relative' }}>
                  <Shield size={16} style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
                  }} />
                  <input
                    id="otp" type="text" className="form-input"
                    placeholder="123456"
                    maxLength={6}
                    style={{ paddingLeft: '42px', letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 700 }}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Role Dropdown */}
              {availableRoles.length > 1 ? (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label htmlFor="login-role">Select Role to Login As</label>
                  <div style={{ position: 'relative' }}>
                    <Shield size={16} style={{
                      position: 'absolute', left: '14px', top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
                    }} />
                    <select
                      id="login-role"
                      className="form-input"
                      style={{ paddingLeft: '42px', color: 'var(--text-primary)', background: 'var(--bg-card)', cursor: 'pointer' }}
                      value={userType}
                      onChange={e => setUserType(e.target.value as 'ProductManager' | 'Employee')}
                      required
                    >
                      {availableRoles.map(role => (
                        <option key={role} value={role} style={{ color: '#1E293B' }}>
                          {role === 'ProductManager' ? 'Product Manager' : 'Employee'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : availableRoles.length === 1 ? (
                <div style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <AlertCircle size={14} style={{ color: 'var(--primary)' }} />
                  <span>Logging in as <strong>{availableRoles[0] === 'ProductManager' ? 'Product Manager' : 'Employee'}</strong></span>
                </div>
              ) : null}

              {/* Back to password link */}
              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowOtp(false);
                    setOtp('');
                  }}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--primary-hover)', fontSize: '0.8rem',
                    cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  Back to Password Login
                </button>
              </div>
            </>
          )}

          {/* Submit */}
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
                  marginRight: '8px', verticalAlign: 'middle',
                }} />
                {showOtp ? 'Verifying OTP...' : 'Signing in...'}
              </>
            ) : (
              <>{showOtp ? 'Verify OTP & Log In' : 'Sign In'} <ArrowRight size={16} style={{ marginLeft: '6px', verticalAlign: 'middle' }} /></>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
