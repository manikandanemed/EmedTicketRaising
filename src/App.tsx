import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, BrowserRouter } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Bug, 
  LogOut, 
  User,
  Layers,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  X
} from 'lucide-react';
import { toast, ToastMessage } from './services/toast';
import { UserSession, API_BASE_URL, api } from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import EmployeeDashboard from './pages/EmployeeDashboard';
import WorkItemDetails from './pages/WorkItemDetails';
import EmployeeManagement from './pages/EmployeeManagement';
import BugDetails from './pages/BugDetails';
import MyNotes from './pages/MyNotes';
import ResetPassword from './pages/ResetPassword';

// Auth Context
interface AuthContextType {
  user: UserSession | null;
  login: (session: UserSession) => void;
  logout: () => void;
  updateUser: (updatedUser: UserSession) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Protected Layout
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isPM = user.userType === 'ProductManager';

  const navItems = isPM
    ? [
        { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard', match: (p: string) => p === '/' },
        { to: '/projects', icon: <Briefcase size={18} />, label: 'Projects', match: (p: string) => p.startsWith('/projects') },
        { to: '/employees', icon: <Users size={18} />, label: 'Employees', match: (p: string) => p.startsWith('/employees') },
        { to: '/notes', icon: <FileText size={18} />, label: 'My Notes', match: (p: string) => p.startsWith('/notes') },
        { to: '/reset-password', icon: <User size={18} />, label: 'My Profile', match: (p: string) => p.startsWith('/reset-password') },
      ]
    : [
        { to: '/', icon: <CheckSquare size={18} />, label: 'My Works', match: (p: string) => p === '/' },
        { to: '/notes', icon: <FileText size={18} />, label: 'My Notes', match: (p: string) => p.startsWith('/notes') },
        { to: '/reset-password', icon: <User size={18} />, label: 'My Profile', match: (p: string) => p.startsWith('/reset-password') },
      ];

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Navbar */}
      <header className="top-navbar" style={{
        height: '60px',
        background: '#8B7AD0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 101,
        position: 'fixed',
        top: 0, left: 0, right: 0
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#FBBF24' }}>e</span><span style={{ color: '#fff' }}>Med Ticketing System</span>
          </span>
        </div>
        
        {/* Right side items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            fontWeight: 600
          }}>
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '50%',
              background: '#FBBF24',
              color: '#1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              {initials[0]}
            </div>
            <span>{user.name}</span>
            {user.roles && user.roles.length > 1 ? (
              <select
                value={user.userType}
                onChange={async (e) => {
                  const targetRole = e.target.value as 'ProductManager' | 'Employee';
                  try {
                    const res = await api.switchRole(targetRole);
                    if (res.success) {
                      updateUser(res.data);
                      toast.success(`Switched role to ${targetRole === 'ProductManager' ? 'Product Manager' : 'Employee'}`);
                      navigate('/');
                    } else {
                      toast.error('Failed to switch role');
                    }
                  } catch (err: any) {
                    toast.error(err.message || 'Error switching role');
                  }
                }}
                style={{
                  fontSize: '0.72rem',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  textAlign: 'center',
                  paddingRight: '16px',
                  position: 'relative',
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='12' viewBox='0 0 24 24' width='12' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 4px center',
                }}
              >
                <option value="Employee" style={{ color: '#1E293B' }}>Employee</option>
                <option value="ProductManager" style={{ color: '#1E293B' }}>Product Manager</option>
              </select>
            ) : (
              <span style={{
                fontSize: '0.72rem',
                background: 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 500
              }}>
                {isPM ? 'Product Manager' : 'Employee'}
              </span>
            )}
          </div>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            title="Logout"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 600,
              gap: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Navigation */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <ul className="nav-links">
              {navItems.map((item) => {
                const isActive = item.match(location.pathname);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

// Route Protector
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  return user ? <Layout>{children}</Layout> : null;
};

// Toast Container
const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((message, type) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    });
    return unsubscribe;
  }, []);

  const colorMap = {
    success: { border: '#A7F3D0', bg: '#ECFDF5', text: '#065F46', iconColor: '#10B981' },
    error:   { border: '#FCA5A5', bg: '#FEF2F2', text: '#991B1B', iconColor: '#EF4444' },
    info:    { border: '#C7D2FE', bg: '#EEF2FF', text: '#3730A3', iconColor: '#6366F1' },
  };

  return (
    <div style={{
      position: 'fixed',
      top: '24px', right: '24px',
      zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: '10px',
      pointerEvents: 'none'
    }}>
      {toasts.map(t => {
        const colors = colorMap[t.type as keyof typeof colorMap] || colorMap.info;
        const iconMap = {
          success: <CheckCircle size={16} color={colors.iconColor} style={{ flexShrink: 0 }} />,
          error:   <AlertCircle size={16} color={colors.iconColor}  style={{ flexShrink: 0 }} />,
          info:    <Info        size={16} color={colors.iconColor}    style={{ flexShrink: 0 }} />,
        };
        
        return (
          <div
            key={t.id}
            className="toast-item"
            style={{
              pointerEvents: 'auto',
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              boxShadow: `0 4px 12px rgba(0,0,0,0.05)`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              minWidth: '300px',
              maxWidth: '400px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.88rem',
            }}
          >
            {iconMap[t.type as keyof typeof iconMap]}
            <span style={{ flex: 1, fontWeight: 600, lineHeight: 1.4, color: colors.text }}>
              {t.message}
            </span>
            <button
              onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
              style={{
                background: 'none',
                border: 'none',
                color: colors.text,
                opacity: 0.7,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                borderRadius: '4px',
                flexShrink: 0
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={
          <ProtectedRoute>
            {user?.userType === 'ProductManager' ? <Dashboard /> : <EmployeeDashboard />}
          </ProtectedRoute>
        } />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/workitems/:id" element={<ProtectedRoute><WorkItemDetails /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute><EmployeeManagement /></ProtectedRoute>} />
        <Route path="/bugs/:bugId" element={<ProtectedRoute><BugDetails /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute><MyNotes /></ProtectedRoute>} />
        <Route path="/reset-password" element={<ProtectedRoute><ResetPassword /></ProtectedRoute>} />
      </Routes>
      <ToastContainer />
    </>
  );
};

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token && token !== 'undefined' && token !== 'null') {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = (session: any) => {
    if (!session) return;
    const token = session.token || session.Token;
    const userSession: UserSession = {
      token,
      userType: session.userType || session.UserType,
      name: session.name || session.Name,
      userId: session.userId || session.UserId,
      email: session.email || session.Email,
      profilePicture: session.profilePicture || session.ProfilePicture,
      roles: session.roles || session.Roles || []
    };
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userSession));
      setUser(userSession);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser: any) => {
    if (!updatedUser) return;
    const token = updatedUser.token || updatedUser.Token;
    const userSession: UserSession = {
      token: token || user?.token || '',
      userType: updatedUser.userType || updatedUser.UserType,
      name: updatedUser.name || updatedUser.Name,
      userId: updatedUser.userId || updatedUser.UserId,
      email: updatedUser.email || updatedUser.Email,
      profilePicture: updatedUser.profilePicture || updatedUser.ProfilePicture,
      roles: updatedUser.roles || updatedUser.Roles || user?.roles || []
    };
    if (token) {
      localStorage.setItem('token', token);
    }
    localStorage.setItem('user', JSON.stringify(userSession));
    setUser(userSession);
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        gap: '16px'
      }}>
        <div style={{
          width: '56px', height: '56px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--primary-dark), hsl(185,80%,40%))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px var(--primary-glow)',
          animation: 'pulse-glow 2s ease-in-out infinite'
        }}>
          <Layers size={28} color="#fff" />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
          Loading eMed Ticketing System...
        </span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
       <BrowserRouter basename={import.meta.env.BASE_URL}>
          {/* <Router> */}
        
        <AppContent />
      {/* </Router> */}
       </BrowserRouter>
   
    </AuthContext.Provider>
  );
}
