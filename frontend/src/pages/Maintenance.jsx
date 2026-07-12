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
      <div className="page-header">
        <div className="page-header-left">
          <h1>Maintenance</h1>
          <p>Vehicle service records and workshop management</p>
        </div>
        {canEdit && (
          <button id="add-maintenance-btn" className="btn btn-primary" onClick={() => { setForm(emptyForm); setModal({ open: true }); }}>
            <Plus size={16} /> Log Maintenance
          </button>
        )}
      </div>

      {/* Mini KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card warning">
          <div className="kpi-icon warning"><Wrench size={20} /></div>
          <div className="kpi-value">{activeLogs}</div>
          <div className="kpi-label">Active Maintenance</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success"><CheckCircle size={20} /></div>
          <div className="kpi-value">{logs.filter(l => l.status === 'Closed').length}</div>
          <div className="kpi-label">Completed Services</div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger"><Wrench size={20} /></div>
          <div className="kpi-value">₹{totalCost.toLocaleString('en-IN')}</div>
          <div className="kpi-label">Total Maintenance Cost</div>
        </div>
      </div>

      <div className="filter-bar">
        <select id="maint-status-filter" className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Records</option>
          <option value="Active">Active</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : logs.length === 0 ? (
          <EmptyState icon={Wrench} title="No maintenance records" description="Log a maintenance record to track vehicle servicing." />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
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
                          <button id={`close-maint-${l.id}`} className="btn btn-sm btn-success" onClick={() => setCloseModal({ open: true, log: l })}>
                            <CheckCircle size={13} /> Close
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
            <button className="btn btn-secondary" onClick={() => setModal({ open: false })}>Cancel</button>
            <button id="maint-save-btn" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Create Record'}
            </button>
          </>
        }
      >
        <div className="alert alert-warning">
          <Wrench size={15} />
          Creating this record will automatically set the vehicle status to <strong>In Shop</strong>.
        </div>
        <div className="form-grid">
          <div className="form-group form-full">
            <label className="form-label">Vehicle <span className="required">*</span></label>
            <select className="form-select" value={form.vehicle_id} onChange={e => f('vehicle_id', e.target.value)}>
              <option value="">Select vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registration_number} — {v.name} ({v.status})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Service Type <span className="required">*</span></label>
            <select className="form-select" value={form.type} onChange={e => f('type', e.target.value)}>
              {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Estimated Cost (₹)</label>
            <input type="number" className="form-input" placeholder="5000" value={form.cost} onChange={e => f('cost', e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Start Date <span className="required">*</span></label>
            <input type="date" className="form-input" value={form.start_date} onChange={e => f('start_date', e.target.value)} />
          </div>
          <div className="form-group form-full">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Describe the maintenance work..." value={form.description} onChange={e => f('description', e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Close Modal */}
      <Modal isOpen={closeModal.open} onClose={() => setCloseModal({ open: false, log: null })} title="Close Maintenance Record"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCloseModal({ open: false, log: null })}>Cancel</button>
            <button id="close-maint-confirm-btn" className="btn btn-success" onClick={handleClose} disabled={saving}>
              {saving ? 'Closing...' : 'Close & Restore Vehicle'}
            </button>
          </>
        }
      >
        {closeModal.log && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="alert alert-success">
              <CheckCircle size={15} />
              Closing <strong>{closeModal.log.type}</strong> for <strong>{closeModal.log.registration_number}</strong>.
              Vehicle will be restored to <strong>Available</strong>.
            </div>
            <div className="form-group">
              <label className="form-label">Completion Date</label>
              <input type="date" className="form-input" value={closeDate} onChange={e => setCloseDate(e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
