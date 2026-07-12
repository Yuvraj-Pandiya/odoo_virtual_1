import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { StatusBadge, LoadingSpinner, EmptyState } from '../components/UI';
import { Plus, Search, Edit2, Trash2, Users, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isPast, addDays, isAfter } from 'date-fns';

const LICENSE_CATEGORIES = ['LMV', 'HMV', 'HPMV', 'HTV', 'MGV', 'MCL', 'MCWG'];
const STATUS_OPTIONS = ['Available', 'Off Duty', 'Suspended'];

const emptyForm = {
  name: '', license_number: '', license_category: 'LMV',
  license_expiry: '', contact: '', safety_score: 100, status: 'Available'
};

export default function Drivers() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('fleet_manager', 'safety_officer');

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: '', search: '' });

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get('/drivers', { params });
      setDrivers(data.data);
    } catch (err) {
      toast.error('Failed to load drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, mode: 'create', data: null }); };
  const openEdit = (d) => {
    setForm({
      name: d.name, license_number: d.license_number, license_category: d.license_category,
      license_expiry: d.license_expiry?.split('T')[0], contact: d.contact || '',
      safety_score: d.safety_score, status: d.status
    });
    setModal({ open: true, mode: 'edit', data: d });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.license_number || !form.license_expiry) {
      toast.error('Required: name, license number, expiry date.');
      return;
    }
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/drivers', form);
        toast.success('Driver registered!');
      } else {
        await api.put(`/drivers/${modal.data.id}`, form);
        toast.success('Driver updated!');
      }
      setModal(m => ({ ...m, open: false }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save driver.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this driver?')) return;
    try {
      await api.delete(`/drivers/${id}`);
      toast.success('Driver deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete driver.');
    }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const getLicenseStatus = (expiry) => {
    const d = new Date(expiry);
    if (isPast(d)) return { label: 'Expired', color: 'var(--danger-light)' };
    if (isAfter(addDays(new Date(), 30), d)) return { label: 'Expiring Soon', color: 'var(--warning-light)' };
    return { label: format(d, 'dd MMM yyyy'), color: 'var(--text-secondary)' };
  };

  const expiringCount = drivers.filter(d => d.license_expiring_soon).length;
  const expiredCount = drivers.filter(d => d.license_expired).length;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="page-title">Driver Management</h1>
          <p className="text-muted">Driver profiles, licenses, and compliance tracking</p>
        </div>
        {canEdit && (
          <button id="add-driver-btn" className="btn-logistica" onClick={openCreate}>
            <Plus size={16} /> Add Driver
          </button>
        )}
      </div>

      {(expiringCount > 0 || expiredCount > 0) && (
        <div className="logistica-alert logistica-alert-warning">
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <span>
            {expiredCount > 0 && <><strong>{expiredCount} driver(s)</strong> have expired licenses. </>}
            {expiringCount > 0 && <><strong>{expiringCount} driver(s)</strong> have licenses expiring within 30 days.</>}
            {' '}These drivers cannot be assigned to trips.
          </span>
        </div>
      )}

      <div className="logistica-card mb-4" style={{ padding: '16px 24px' }}>
        <div className="d-flex gap-3 align-items-center flex-wrap">
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-muted)' }} />
            <input id="driver-search" className="logistica-input" style={{ paddingLeft: 36 }} placeholder="Search by name or license..." value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <select id="driver-status-filter" className="logistica-input" style={{ width: 'auto' }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            {['Available', 'On Trip', 'Off Duty', 'Suspended'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="logistica-card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : drivers.length === 0 ? (
          <EmptyState icon={Users} title="No drivers found" description="Register drivers to assign them to trips." />
        ) : (
          <div className="logistica-table-container">
            <table className="logistica-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>License #</th>
                  <th>Category</th>
                  <th>License Expiry</th>
                  <th>Contact</th>
                  <th>Safety Score</th>
                  <th>Trips</th>
                  <th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => {
                  const licStatus = getLicenseStatus(d.license_expiry);
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td><span className="font-mono" style={{ color: 'var(--accent-light)', fontSize: 13 }}>{d.license_number}</span></td>
                      <td>{d.license_category}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {(d.license_expired || d.license_expiring_soon) && (
                            <AlertTriangle size={13} style={{ color: d.license_expired ? 'var(--danger-light)' : 'var(--warning-light)', flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: 13, color: licStatus.color }}>{licStatus.label}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.contact || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 36, height: 4, borderRadius: 4,
                            background: `linear-gradient(90deg, ${d.safety_score >= 80 ? '#10b981' : d.safety_score >= 60 ? '#f59e0b' : '#ef4444'} ${d.safety_score}%, rgba(255,255,255,0.1) 0%)`,
                          }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{d.safety_score}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.completed_trips || 0}</td>
                      <td><StatusBadge status={d.status} /></td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button id={`edit-driver-${d.id}`} className="btn-icon" onClick={() => openEdit(d)}><Edit2 size={16} /></button>
                            <button id={`del-driver-${d.id}`} className="btn-icon text-primary" onClick={() => handleDelete(d.id)}><Trash2 size={16} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modal.open} onClose={() => setModal(m => ({ ...m, open: false }))}
        title={modal.mode === 'create' ? 'Register New Driver' : 'Edit Driver'}
        footer={
          <>
            <button className="btn-logistica-secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</button>
            <button id="driver-save-btn" className="btn-logistica" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : modal.mode === 'create' ? 'Register Driver' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Full Name <span className="text-primary">*</span></label>
            <input className="logistica-input" placeholder="Alex Johnson" value={form.name} onChange={e => f('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">License Number <span className="text-primary">*</span></label>
            <input className="logistica-input" placeholder="DL-2024-001" value={form.license_number}
              onChange={e => f('license_number', e.target.value.toUpperCase())} disabled={modal.mode === 'edit'} />
          </div>
          <div className="form-group">
            <label className="form-label">License Category <span className="text-primary">*</span></label>
            <select className="logistica-input" value={form.license_category} onChange={e => f('license_category', e.target.value)}>
              {LICENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">License Expiry Date <span className="text-primary">*</span></label>
            <input type="date" className="logistica-input" value={form.license_expiry} onChange={e => f('license_expiry', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input className="logistica-input" placeholder="+91-9876543210" value={form.contact} onChange={e => f('contact', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Safety Score (0–100)</label>
            <input type="number" className="logistica-input" min="0" max="100" value={form.safety_score} onChange={e => f('safety_score', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="logistica-input" value={form.status} onChange={e => f('status', e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
