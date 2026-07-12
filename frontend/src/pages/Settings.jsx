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
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Configure TransitOps security, profile, and system settings</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content', border: '1px solid var(--border)' }}>
        {isManager && (
          <button id="tab-rbac"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
              borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === 'rbac' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'rbac' ? 'white' : 'var(--text-secondary)',
              transition: 'all 150ms', fontFamily: 'inherit'
            }}
            onClick={() => setActiveTab('rbac')}
          >
            <Shield size={14} /> RBAC & Users
          </button>
        )}
        <button id="tab-profile"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
            borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: activeTab === 'profile' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'profile' ? 'white' : 'var(--text-secondary)',
            transition: 'all 150ms', fontFamily: 'inherit'
          }}
          onClick={() => setActiveTab('profile')}
        >
          <User size={14} /> Profile & Password
        </button>
        <button id="tab-system"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
            borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: activeTab === 'system' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'system' ? 'white' : 'var(--text-secondary)',
            transition: 'all 150ms', fontFamily: 'inherit'
          }}
          onClick={() => setActiveTab('system')}
        >
          <SettingsIcon size={14} /> System Config
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Tab 1: RBAC & User Directories */}
        {activeTab === 'rbac' && isManager && (
          <div className="form-grid" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'start' }}>
            {/* User List */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                <span className="card-title">User Directory & Role Assignments</span>
              </div>
              {loadingUsers ? <LoadingSpinner /> : (
                <div className="data-table-wrapper">
                  <table className="data-table">
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
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name} {u.id === user.id && <span style={{ color: 'var(--primary-light)', fontSize: 11 }}>(You)</span>}</div>
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td>
                            <select
                              className="filter-select"
                              style={{ padding: '4px 10px', fontSize: 12 }}
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
                            <span className={`badge ${u.is_active ? 'badge-available' : 'badge-suspended'}`}>
                              {u.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
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
            <div className="card">
              <div className="card-header" style={{ padding: 0, marginBottom: 16 }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserPlus size={18} color="var(--primary-light)" /> Register Team Member
                </span>
              </div>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="Yuvraj Pandiya" value={newUserForm.name} onChange={e => setNewUserForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" placeholder="yuvraj@transitops.com" value={newUserForm.email} onChange={e => setNewUserForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" placeholder="••••••" value={newUserForm.password} onChange={e => setNewUserForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role Assignment</label>
                  <select className="form-select" value={newUserForm.role} onChange={e => setNewUserForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={creatingUser}>
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
            <div className="card">
              <div className="card-header" style={{ padding: 0, marginBottom: 16 }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={18} color="var(--primary-light)" /> Personal Information
                </span>
              </div>
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input className="form-input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Update Details'}
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div className="card">
              <div className="card-header" style={{ padding: 0, marginBottom: 16 }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={18} color="var(--primary-light)" /> Change Password
                </span>
              </div>
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" placeholder="••••••••" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-input" placeholder="At least 6 characters" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-input" placeholder="Confirm password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: System Config */}
        {activeTab === 'system' && (
          <div className="card" style={{ maxWidth: 640 }}>
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
                  className="form-input"
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
                  className="form-select"
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

              <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', marginTop: 10 }}>
                Save System Config
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
