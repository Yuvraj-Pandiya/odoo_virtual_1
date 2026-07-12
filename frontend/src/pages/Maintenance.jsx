import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { StatusBadge, LoadingSpinner, EmptyState } from '../components/UI';
import { Plus, Wrench, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const MAINTENANCE_TYPES = ['Oil Change', 'Tire Replacement', 'Engine Overhaul', 'Brake Service', 'Electrical', 'Body Repair', 'Inspection', 'Other'];

const emptyForm = { vehicle_id: '', type: 'Oil Change', description: '', cost: '', start_date: new Date().toISOString().split('T')[0] };

export default function Maintenance() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('fleet_manager', 'safety_officer');

  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false });
  const [closeModal, setCloseModal] = useState({ open: false, log: null });
  const [form, setForm] = useState(emptyForm);
  const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const [logRes, vRes] = await Promise.all([
        api.get('/maintenance', { params }),
        api.get('/vehicles'),
      ]);
      setLogs(logRes.data.data);
      setVehicles(vRes.data.data.filter(v => v.status !== 'On Trip' && v.status !== 'Retired'));
    } catch (err) {
      toast.error('Failed to load maintenance logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.type || !form.start_date) {
      toast.error('Vehicle, type, and start date are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/maintenance', form);
      toast.success('Maintenance log created. Vehicle is now In Shop.');
      setModal({ open: false });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create log.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    setSaving(true);
    try {
      await api.post(`/maintenance/${closeModal.log.id}/close`, { end_date: closeDate });
      toast.success('Maintenance closed. Vehicle restored to Available.');
      setCloseModal({ open: false, log: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close maintenance.');
    } finally {
      setSaving(false);
    }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const totalCost = logs.reduce((sum, l) => sum + parseFloat(l.cost || 0), 0);
  const activeLogs = logs.filter(l => l.status === 'Active').length;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="page-title">Maintenance</h1>
          <p className="text-muted">Vehicle service records and workshop management</p>
        </div>
        {canEdit && (
          <button id="add-maintenance-btn" className="btn-logistica" onClick={() => { setForm(emptyForm); setModal({ open: true }); }}>
            <Plus size={16} /> Log Maintenance
          </button>
        )}
      </div>

      {/* Mini KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="logistica-card">
          <div className="d-flex align-items-center mb-3">
            <div style={{ width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--logistica-secondary)', color: 'white' }}>
              <Wrench size={22} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>{activeLogs}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Active Maintenance</div>
        </div>
        <div className="logistica-card">
          <div className="d-flex align-items-center mb-3">
            <div style={{ width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', color: 'white' }}>
              <CheckCircle size={22} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>{logs.filter(l => l.status === 'Closed').length}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Completed Services</div>
        </div>
        <div className="logistica-card">
          <div className="d-flex align-items-center mb-3">
            <div style={{ width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', color: 'white' }}>
              <Wrench size={22} />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>₹{totalCost.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Total Maintenance Cost</div>
        </div>
      </div>

      <div className="logistica-card mb-4" style={{ padding: '16px 24px' }}>
        <select id="maint-status-filter" className="logistica-input" style={{ width: '200px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Records</option>
          <option value="Active">Active</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="logistica-card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : logs.length === 0 ? (
          <EmptyState icon={Wrench} title="No maintenance records" description="Log a maintenance record to track vehicle servicing." />
        ) : (
          <div className="logistica-table-container">
            <table className="logistica-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Service Type</th>
                  <th>Description</th>
                  <th>Cost</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{l.registration_number}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.vehicle_name}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>{l.type}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 200 }}>
                      <div className="truncate">{l.description || '—'}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{parseFloat(l.cost || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontSize: 13 }}>{format(new Date(l.start_date), 'dd MMM yyyy')}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {l.end_date ? format(new Date(l.end_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td><StatusBadge status={l.status} /></td>
                    {canEdit && (
                      <td>
                        {l.status === 'Active' && (
                          <button id={`close-maint-${l.id}`} className="btn-icon text-success" onClick={() => setCloseModal({ open: true, log: l })}>
                            <CheckCircle size={16} /> Close
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false })} title="Log Maintenance Record"
        footer={
          <>
            <button className="btn-logistica-secondary" onClick={() => setModal({ open: false })}>Cancel</button>
            <button id="maint-save-btn" className="btn-logistica" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Create Record'}
            </button>
          </>
        }
      >
        <div className="logistica-alert logistica-alert-warning">
          <Wrench size={20} />
          <span>Creating this record will automatically set the vehicle status to <strong>In Shop</strong>.</span>
        </div>
        <div className="form-grid">
          <div className="form-group form-full">
            <label className="form-label">Vehicle <span className="text-primary">*</span></label>
            <select className="logistica-input" value={form.vehicle_id} onChange={e => f('vehicle_id', e.target.value)}>
              <option value="">Select vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registration_number} — {v.name} ({v.status})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Service Type <span className="text-primary">*</span></label>
            <select className="logistica-input" value={form.type} onChange={e => f('type', e.target.value)}>
              {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Estimated Cost (₹)</label>
            <input type="number" className="logistica-input" placeholder="5000" value={form.cost} onChange={e => f('cost', e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Start Date <span className="text-primary">*</span></label>
            <input type="date" className="logistica-input" value={form.start_date} onChange={e => f('start_date', e.target.value)} />
          </div>
          <div className="form-group form-full">
            <label className="form-label">Description</label>
            <textarea className="logistica-input" placeholder="Describe the maintenance work..." value={form.description} onChange={e => f('description', e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Close Modal */}
      <Modal isOpen={closeModal.open} onClose={() => setCloseModal({ open: false, log: null })} title="Close Maintenance Record"
        footer={
          <>
            <button className="btn-logistica-secondary" onClick={() => setCloseModal({ open: false, log: null })}>Cancel</button>
            <button id="close-maint-confirm-btn" className="btn-logistica" style={{ backgroundColor: '#10b981' }} onClick={handleClose} disabled={saving}>
              {saving ? 'Closing...' : 'Close & Restore Vehicle'}
            </button>
          </>
        }
      >
        {closeModal.log && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="logistica-alert logistica-alert-warning" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderLeftColor: '#10b981' }}>
              <CheckCircle size={20} />
              <div>
                Closing <strong>{closeModal.log.type}</strong> for <strong>{closeModal.log.registration_number}</strong>.<br/>
                Vehicle will be restored to <strong>Available</strong>.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Completion Date</label>
              <input type="date" className="logistica-input" value={closeDate} onChange={e => setCloseDate(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
