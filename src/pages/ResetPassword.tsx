import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api, API_BASE_URL } from '../services/api';
import { useAuth } from '../App';
import { KeyRound, Lock, CheckCircle, AlertCircle, Camera, Trash2 } from 'lucide-react';

export default function ResetPassword() {
  const { user, logout, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Photo Upload State
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // Custom Confirm Modal
  const [customConfirm, setCustomConfirm] = useState<{
    title: string; message: string; onConfirm: () => void;
    isDanger?: boolean; confirmLabel?: string;
  } | null>(null);
  const showConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false, confirmLabel = 'Confirm') => {
    setCustomConfirm({ title, message, onConfirm, isDanger, confirmLabel });
  };

  // Cropper State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imagePos, setImagePos] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - imagePos.x, y: e.clientY - imagePos.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setImagePos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - imagePos.x,
      y: e.touches[0].clientY - imagePos.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setImagePos({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const containerSize = 240;
    const hRatio = containerSize / img.naturalWidth;
    const vRatio = containerSize / img.naturalHeight;
    const baseScale = Math.max(hRatio, vRatio);
    
    setImgSize({
      width: img.naturalWidth * baseScale,
      height: img.naturalHeight * baseScale
    });
    setImagePos({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleSaveCrop = () => {
    if (!cropImageSrc) return;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const img = new Image();
      img.src = cropImageSrc;
      img.onload = () => {
        ctx.clearRect(0, 0, 300, 300);
        ctx.save();
        ctx.translate(150, 150);
        ctx.translate(imagePos.x * 1.25, imagePos.y * 1.25);
        ctx.scale(zoom, zoom);
        const drawWidth = imgSize.width * 1.25;
        const drawHeight = imgSize.height * 1.25;
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const croppedFile = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
            await uploadCroppedPhoto(croppedFile);
          }
        }, 'image/jpeg', 0.9);
      };
    }
  };

  const uploadCroppedPhoto = async (file: File) => {
    setUploading(true);
    setPhotoError('');
    try {
      const res = await api.uploadProfilePicture(file);
      if (res.success) {
        if (user) {
          updateUser({
            ...user,
            profilePicture: res.data
          });
        }
        setCropImageSrc(null);
      } else {
        setPhotoError(res.message || 'Failed to upload photo');
      }
    } catch (err: any) {
      setPhotoError(err.message || 'Error uploading photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(currentPassword, newPassword);
      if (res.success) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Start countdown to logout
        let count = 3;
        const interval = setInterval(() => {
          count -= 1;
          setCountdown(count);
          if (count === 0) {
            clearInterval(interval);
            logout();
          }
        }, 1000);
      } else {
        setError(res.message || 'Failed to reset password. Please verify your current password.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = async () => {
    showConfirm(
      'Remove Profile Photo?',
      'Are you sure you want to remove your profile photo?',
      async () => {
        setUploading(true);
        setPhotoError('');
        try {
          const res = await api.removeProfilePicture();
          if (res.success) {
            if (user) {
              updateUser({
                ...user,
                profilePicture: undefined
              });
            }
          } else {
            setPhotoError(res.message || 'Failed to remove photo');
          }
        } catch (err: any) {
          setPhotoError(err.message || 'Error removing photo');
        } finally {
          setUploading(false);
        }
      },
      true,
      'Yes, Remove'
    );
  };

  if (!user) return null;

  return (
    <div className="page-enter">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1>My Profile Settings</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your personal details, profile picture, and account password.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '30px', alignItems: 'start' }}>
        {/* Left Column: Profile Picture Upload */}
        <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 24px 0', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Camera size={20} className="gradient-text" />
            <span>Profile Picture</span>
          </h3>

          {/* Picture Display */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            {user.profilePicture ? (
              <img
                src={`${API_BASE_URL}${user.profilePicture}`}
                alt={user.name}
                style={{
                  width: '130px',
                  height: '130px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}
              />
            ) : (
              <div style={{
                width: '130px', height: '130px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-dark) 0%, hsl(185,80%,40%) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '3rem', fontWeight: 800, color: 'white',
                border: '3px solid rgba(14,165,233,0.4)',
                boxShadow: '0 0 30px var(--primary-glow), 0 8px 24px rgba(0,0,0,0.3)'
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {uploading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                color: '#fff',
                fontWeight: 600
              }}>
                Updating...
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700 }}>{user.name}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {user.userType === 'ProductManager' ? 'Product Manager' : 'Employee'}
            </p>
          </div>

          {photoError && (
            <div style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} />
              <span>{photoError}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button 
              className="btn btn-primary" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
            >
              <Camera size={16} />
              <span>Upload Photo</span>
            </button>
            {user.profilePicture && (
              <button 
                className="btn btn-secondary" 
                onClick={handlePhotoRemove}
                disabled={uploading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.2)' }}
              >
                <Trash2 size={16} />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Email + Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Change Password Panel */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h3 style={{ margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <KeyRound size={20} className="gradient-text" />
              <span>Change Password</span>
            </h3>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px', fontWeight: 600, fontSize: '1.2rem' }}>
                <CheckCircle size={24} />
                <span>Password Changed Successfully!</span>
              </div>
              <p style={{ color: 'var(--text-normal)', margin: '0 0 10px 0' }}>
                For security reasons, you will be logged out.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                Logging out in <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{countdown}</strong> seconds...
              </p>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && (
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: '6px', 
                  padding: '12px 16px', 
                  color: 'var(--danger)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  fontSize: '0.9rem' 
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input
                    id="currentPassword"
                    type="password"
                    className="form-input"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input
                    id="newPassword"
                    type="password"
                    className="form-input"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input
                    id="confirmPassword"
                    type="password"
                    className="form-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                style={{ padding: '12px', fontWeight: 600, fontSize: '0.95rem', marginTop: '10px' }}
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}
          </div>{/* /Change Password glass-panel */}
        </div>{/* /Right column flex */}
      </div>{/* /Grid */}

      {cropImageSrc && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', width: '90%', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px', fontWeight: 800 }}>Crop Profile Picture</h3>
            
            <div 
              style={{
                position: 'relative',
                width: '240px',
                height: '240px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--primary)',
                background: '#000',
                cursor: 'move',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              <img
                src={cropImageSrc}
                alt="To Crop"
                draggable={false}
                style={{
                  position: 'absolute',
                  width: `${imgSize.width}px`,
                  height: `${imgSize.height}px`,
                  left: `${(240 - imgSize.width) / 2 + imagePos.x}px`,
                  top: `${(240 - imgSize.height) / 2 + imagePos.y}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
                onLoad={handleImageLoad}
              />
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Drag the image to position, use the slider to zoom.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '280px', margin: '0 auto 24px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>➖</span>
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.02" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  accentColor: 'var(--primary)',
                  height: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>➕</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setCropImageSrc(null)}
                disabled={uploading}
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSaveCrop}
                disabled={uploading}
                style={{ padding: '8px 20px', minWidth: '100px' }}
              >
                {uploading ? 'Uploading...' : 'Save & Set'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Confirm Modal */}
      {customConfirm && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div 
            className="modal-content glass-panel" 
            style={{ 
              maxWidth: '450px', 
              padding: '24px', 
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(20, 20, 25, 0.92)'
            }}
          >
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: customConfirm.isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertCircle size={22} style={{ color: customConfirm.isDanger ? '#ef4444' : '#8b5cf6' }} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                  {customConfirm.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#a1a1aa', lineHeight: 1.5 }}>
                  {customConfirm.message}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCustomConfirm(null)}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                className={`btn ${customConfirm.isDanger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => {
                  setCustomConfirm(null);
                  customConfirm.onConfirm();
                }}
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                {customConfirm.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
