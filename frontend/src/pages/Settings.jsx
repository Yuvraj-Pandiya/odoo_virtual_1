import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/UI';
import { Shield, User, Settings as SettingsIcon, AlertCircle, CheckCircle2, UserPlus, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'financial_analyst', label: 'Financial Analyst' }
];

export default function Settings() {
  const { user, hasRole } = useAuth();
  const isManager = hasRole('fleet_manager');

  const [activeTab, setActiveTab] = useState(isManager ? 'rbac' : 'profile');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Forms
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '', role: 'dispatcher' });

  // System parameters (simulated/localStorage based settings)
  const [sysConfig, setSysConfig] = useState(() => {
    const saved = localStorage.getItem('transitops_config');
    return saved ? JSON.parse(saved) : {
      licenseWarningDays: '30',
      maxCargoSafetyFactor: '1.0',
      enableRealtimeAlerts: true
    };
  });

  const loadUsers = async () => {
    if (!isManager) return;
    try {
      setLoadingUsers(true);
      const { data } = await api.get('/auth/users');
      setUsers(data.data);
    } catch (err) {
      toast.error('Failed to load user directories');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rbac') {
      loadUsers();
    }
  }, [activeTab]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.email) {
      toast.error('Please enter name and email.');
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', profileForm);
      localStorage.setItem('transitops_user', JSON.stringify(data.user));
      toast.success('Profile updated successfully!');
      // Update global context by refreshing window or manual state sync
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const { name, email, password, role } = newUserForm;
    if (!name || !email || !password || !role) {
      toast.error('All fields are required.');
      return;
    }
    setCreatingUser(true);
    try {
      await api.post('/auth/register', newUserForm);
      toast.success('New user registered successfully!');
      setNewUserForm({ name: '', email: '', password: '', role: 'dispatcher' });
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register user.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await api.put(`/auth/users/${targetUserId}/role`, { role: newRole });
      toast.success('User role updated!');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const handleStatusToggle = async (targetUserId, currentStatus) => {
    try {
      await api.put(`/auth/users/${targetUserId}/status`, { is_active: !currentStatus });
      toast.success(`User account ${!currentStatus ? 'enabled' : 'disabled'}`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleConfigSave = (e) => {
    e.preventDefault();
    localStorage.setItem('transitops_config', JSON.stringify(sysConfig));
    toast.success('System configuration saved!');
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-left">
          <h1 className="page-title"><SettingsIcon size={28} /> Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>Configure TransitOps security, profile, and system settings</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="kpi-grid">
        <div className="logistica-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(255, 62, 65, 0.1)', padding: 16, borderRadius: 8 }}>
            <User size={28} color="var(--logistica-primary)" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-muted)' }}>Account Role</h4>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ') || 'User'}</p>
          </div>
        </div>
        <div className="logistica-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(81, 207, 237, 0.1)', padding: 16, borderRadius: 8 }}>
            <Shield size={28} color="var(--logistica-secondary)" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-muted)' }}>Security Status</h4>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Secured</p>
          </div>
        </div>
        <div className="logistica-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 16, borderRadius: 8 }}>
            <CheckCircle2 size={28} color="#10b981" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-muted)' }}>System Status</h4>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Online</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, background: 'var(--bg-card)', padding: 8, borderRadius: 8, width: 'fit-content', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
        {isManager && (
          <button id="tab-rbac"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600,
              background: activeTab === 'rbac' ? 'var(--logistica-primary)' : 'transparent',
              color: activeTab === 'rbac' ? 'white' : 'var(--text-muted)',
              transition: 'all 0.3s', fontFamily: 'inherit'
            }}
            onClick={() => setActiveTab('rbac')}
          >
            <Shield size={18} /> RBAC & Users
          </button>
        )}
        <button id="tab-profile"
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
            borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600,
            background: activeTab === 'profile' ? 'var(--logistica-primary)' : 'transparent',
            color: activeTab === 'profile' ? 'white' : 'var(--text-muted)',
            transition: 'all 0.3s', fontFamily: 'inherit'
          }}
          onClick={() => setActiveTab('profile')}
        >
          <User size={18} /> Profile & Password
        </button>
        <button id="tab-system"
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
            borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600,
            background: activeTab === 'system' ? 'var(--logistica-primary)' : 'transparent',
            color: activeTab === 'system' ? 'white' : 'var(--text-muted)',
            transition: 'all 0.3s', fontFamily: 'inherit'
          }}
          onClick={() => setActiveTab('system')}
        >
          <SettingsIcon size={18} /> System Config
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Tab 1: RBAC & User Directories */}
        {activeTab === 'rbac' && isManager && (
          <div className="form-grid" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'start', gap: 32 }}>
            {/* User List */}
            <div className="logistica-card">
              <div className="card-header" style={{ padding: 0, marginBottom: 16 }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={18} color="var(--logistica-primary)" /> User Directory & Role Assignments
                </span>
              </div>
              {loadingUsers ? <LoadingSpinner /> : (
                <div className="logistica-table-container" style={{ margin: 0, boxShadow: 'none', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  <table className="logistica-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <User size={16} color="var(--logistica-primary)" />
                              {u.name} 
                              {u.id === user.id && <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 400 }}>(You)</span>}
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>{u.email}</td>
                          <td>
                            <select
                              className="logistica-input"
                              style={{ padding: '6px 10px', fontSize: 13, minWidth: 140 }}
                              value={u.role}
                              disabled={u.id === user.id}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            >
                              {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={`logistica-badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                              {u.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            <button
                              style={{
                                background: u.is_active ? '#ef4444' : '#10b981',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: 4,
                                border: 'none',
                                cursor: u.id === user.id ? 'not-allowed' : 'pointer',
                                opacity: u.id === user.id ? 0.5 : 1,
                                fontSize: 13,
                                fontWeight: 500
                              }}
                              disabled={u.id === user.id}
                              onClick={() => handleStatusToggle(u.id, u.is_active)}
                            >
                              {u.is_active ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add User */}
            <div className="logistica-card">
              <div className="card-header" style={{ padding: 0, marginBottom: 16 }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserPlus size={18} color="var(--logistica-primary)" /> Register Team Member
                </span>
              </div>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="logistica-input" placeholder="Yuvraj Pandiya" value={newUserForm.name} onChange={e => setNewUserForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="logistica-input" placeholder="yuvraj@transitops.com" value={newUserForm.email} onChange={e => setNewUserForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className="logistica-input" placeholder="••••••" value={newUserForm.password} onChange={e => setNewUserForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role Assignment</label>
                  <select className="logistica-input" value={newUserForm.role} onChange={e => setNewUserForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-logistica w-full" style={{ justifyContent: 'center' }} disabled={creatingUser}>
                  {creatingUser ? 'Registering...' : 'Register User'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Profile Settings */}
        {activeTab === 'profile' && (
          <div className="form-grid">
            {/* Profile Info */}
            <div className="logistica-card">
              <div className="card-header" style={{ padding: 0, marginBottom: 16 }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} color="var(--primary-light)" /> Personal Information
                </span>
              </div>
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input className="logistica-input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="logistica-input" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <button type="submit" className="btn-logistica" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Update Details'}
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div className="logistica-card">
              <div className="card-header" style={{ padding: 0, marginBottom: 16 }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={18} color="var(--primary-light)" /> Change Password
                </span>
              </div>
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="logistica-input" placeholder="••••••••" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="logistica-input" placeholder="At least 6 characters" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="logistica-input" placeholder="Confirm password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                </div>
                <button type="submit" className="btn-logistica" disabled={savingPassword}>
                  {savingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: System Config */}
        {activeTab === 'system' && (
          <div className="logistica-card" style={{ maxWidth: 640 }}>
            <div className="card-header" style={{ padding: 0, marginBottom: 20 }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SettingsIcon size={18} color="var(--primary-light)" /> Operation Threshold Settings
              </span>
            </div>
            <form onSubmit={handleConfigSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">License Expiry Notification Threshold (Days)</label>
                <input
                  type="number"
                  className="logistica-input"
                  value={sysConfig.licenseWarningDays}
                  onChange={e => setSysConfig(c => ({ ...c, licenseWarningDays: e.target.value }))}
                  min="5"
                  max="180"
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Displays warnings on the Dashboard if license expiration is within this range.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Max Load Safety Buffer Factor</label>
                <select
                  className="logistica-input"
                  value={sysConfig.maxCargoSafetyFactor}
                  onChange={e => setSysConfig(c => ({ ...c, maxCargoSafetyFactor: e.target.value }))}
                >
                  <option value="1.0">1.0x (Normal load limit capacity)</option>
                  <option value="0.95">0.95x (Enforce 5% safety margin)</option>
                  <option value="0.90">0.90x (Enforce 10% safety margin)</option>
                </select>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Limits the cargo load assignment based on safety margin settings.</span>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <input
                  type="checkbox"
                  id="realtime_alert"
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                  checked={sysConfig.enableRealtimeAlerts}
                  onChange={e => setSysConfig(c => ({ ...c, enableRealtimeAlerts: e.target.checked }))}
                />
                <label htmlFor="realtime_alert" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Enable System-wide Real-time KPI Refreshing</label>
              </div>

              <button type="submit" className="btn-logistica" style={{ width: 'fit-content', marginTop: 10 }}>
                Save System Config
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
