import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { StatusBadge, LoadingSpinner, EmptyState } from '../components/UI';
import { Plus, Search, Route, CheckCircle, XCircle, Zap, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const emptyForm = {
  source: '', destination: '', vehicle_id: '', driver_id: '',
  cargo_weight_kg: '', planned_distance_km: '', revenue: '', notes: ''
};

const emptyComplete = { actual_distance_km: '', fuel_consumed_l: '' };

export default function Trips() {
  const { hasRole } = useAuth();
  const canCreate = hasRole('fleet_manager', 'driver');

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: 'create' });
  const [completeModal, setCompleteModal] = useState({ open: false, trip: null });
  const [viewModal, setViewModal] = useState({ open: false, trip: null });
  const [form, setForm] = useState(emptyForm);
  const [completeForm, setCompleteForm] = useState(emptyComplete);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: '', search: '' });

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get('/trips', { params });
      setTrips(data.data);
    } catch (err) {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const loadSelections = async () => {
    const [vRes, dRes] = await Promise.all([
      api.get('/vehicles/available'),
      api.get('/drivers/available'),
    ]);
    setVehicles(vRes.data.data);
    setDrivers(dRes.data.data);
  };

  useEffect(() => { load(); }, [filters]);

  const openCreate = async () => {
    await loadSelections();
    setForm(emptyForm);
    setModal({ open: true, mode: 'create' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ['source', 'destination', 'vehicle_id', 'driver_id', 'cargo_weight_kg', 'planned_distance_km'];
    if (required.some(k => !form[k])) {
      toast.error('Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/trips', form);
      toast.success('Trip created!');
      setModal(m => ({ ...m, open: false }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create trip.');
    } finally {
      setSaving(false);
    }
  };

  const dispatch = async (id) => {
    try {
      await api.post(`/trips/${id}/dispatch`);
      toast.success('Trip dispatched! Vehicle & Driver now On Trip.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dispatch failed.');
    }
  };

  const openComplete = (trip) => {
    setCompleteForm({ actual_distance_km: trip.planned_distance_km, fuel_consumed_l: '' });
    setCompleteModal({ open: true, trip });
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await api.post(`/trips/${completeModal.trip.id}/complete`, completeForm);
      toast.success('Trip completed! Vehicle & Driver now Available.');
      setCompleteModal({ open: false, trip: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete trip.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this trip?')) return;
    try {
      await api.post(`/trips/${id}/cancel`);
      toast.success('Trip cancelled.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel.');
    }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const selectedVehicle = vehicles.find(v => v.id === parseInt(form.vehicle_id));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Trip Management</h1>
          <p>Create, dispatch, complete and track all deliveries</p>
        </div>
        {canCreate && (
          <button id="add-trip-btn" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Create Trip
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input id="trip-search" placeholder="Search source, destination, vehicle..." value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <select id="trip-status-filter" className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {['Draft', 'Dispatched', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : trips.length === 0 ? (
          <EmptyState icon={Route} title="No trips found" description="Create your first trip to start dispatching." />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Cargo</th>
                  <th>Distance</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.source}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ {t.destination}</div>
                    </td>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--primary-light)', fontSize: 12 }}>{t.registration_number}</span>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.vehicle_name}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{t.driver_name}</td>
                    <td style={{ fontSize: 13 }}>{parseFloat(t.cargo_weight_kg).toLocaleString()} kg</td>
                    <td style={{ fontSize: 13 }}>
                      {t.actual_distance_km ? `${parseFloat(t.actual_distance_km)} km` : `${parseFloat(t.planned_distance_km)} km (plan)`}
                    </td>
                    <td style={{ fontSize: 13 }}>₹{parseFloat(t.revenue || 0).toLocaleString('en-IN')}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {format(new Date(t.created_at), 'dd MMM yy')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button id={`view-trip-${t.id}`} className="btn btn-sm btn-secondary" onClick={() => setViewModal({ open: true, trip: t })} title="View"><Eye size={13} /></button>
                        {t.status === 'Draft' && canCreate && (
                          <button id={`dispatch-trip-${t.id}`} className="btn btn-sm btn-primary" onClick={() => dispatch(t.id)} title="Dispatch">
                            <Zap size={13} />
                          </button>
                        )}
                        {t.status === 'Dispatched' && canCreate && (
                          <>
                            <button id={`complete-trip-${t.id}`} className="btn btn-sm btn-success" onClick={() => openComplete(t)} title="Complete">
                              <CheckCircle size={13} />
                            </button>
                            <button id={`cancel-trip-${t.id}`} className="btn btn-sm btn-danger" onClick={() => cancel(t.id)} title="Cancel">
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                        {t.status === 'Draft' && canCreate && (
                          <button id={`cancel-draft-trip-${t.id}`} className="btn btn-sm btn-danger" onClick={() => cancel(t.id)} title="Cancel"><XCircle size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Trip Modal */}
      <Modal isOpen={modal.open} onClose={() => setModal(m => ({ ...m, open: false }))} title="Create New Trip" size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</button>
            <button id="trip-save-btn" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Creating...' : 'Create Trip'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Source <span className="required">*</span></label>
            <input className="form-input" placeholder="e.g. Mumbai" value={form.source} onChange={e => f('source', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Destination <span className="required">*</span></label>
            <input className="form-input" placeholder="e.g. Pune" value={form.destination} onChange={e => f('destination', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Vehicle <span className="required">*</span></label>
            <select className="form-select" value={form.vehicle_id} onChange={e => f('vehicle_id', e.target.value)}>
              <option value="">Select available vehicle...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registration_number} — {v.name} (Max: {v.max_load_kg} kg)</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Driver <span className="required">*</span></label>
            <select className="form-select" value={form.driver_id} onChange={e => f('driver_id', e.target.value)}>
              <option value="">Select available driver...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.license_number})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cargo Weight (kg) <span className="required">*</span></label>
            <input type="number" className="form-input" placeholder="450" value={form.cargo_weight_kg}
              onChange={e => f('cargo_weight_kg', e.target.value)} min="0" />
            {selectedVehicle && (
              <span style={{ fontSize: 12, color: parseFloat(form.cargo_weight_kg) > parseFloat(selectedVehicle.max_load_kg) ? 'var(--danger-light)' : 'var(--success-light)' }}>
                {parseFloat(form.cargo_weight_kg) > parseFloat(selectedVehicle.max_load_kg)
                  ? `⚠️ Exceeds max load of ${selectedVehicle.max_load_kg} kg`
                  : `✓ Within limit of ${selectedVehicle.max_load_kg} kg`}
              </span>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Planned Distance (km) <span className="required">*</span></label>
            <input type="number" className="form-input" placeholder="150" value={form.planned_distance_km}
              onChange={e => f('planned_distance_km', e.target.value)} min="1" />
          </div>
          <div className="form-group">
            <label className="form-label">Expected Revenue (₹)</label>
            <input type="number" className="form-input" placeholder="12000" value={form.revenue}
              onChange={e => f('revenue', e.target.value)} min="0" />
          </div>
          <div className="form-group form-full">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" placeholder="Any special instructions..." value={form.notes}
              onChange={e => f('notes', e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Complete Trip Modal */}
      <Modal isOpen={completeModal.open} onClose={() => setCompleteModal({ open: false, trip: null })}
        title="Complete Trip"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCompleteModal({ open: false, trip: null })}>Cancel</button>
            <button id="complete-trip-confirm-btn" className="btn btn-success" onClick={handleComplete} disabled={saving}>
              {saving ? 'Completing...' : 'Mark as Completed'}
            </button>
          </>
        }
      >
        {completeModal.trip && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="alert alert-success">
              <CheckCircle size={15} />
              Completing trip: <strong>{completeModal.trip.source} → {completeModal.trip.destination}</strong>.
              Vehicle and Driver will be set back to Available.
            </div>
            <div className="form-group">
              <label className="form-label">Actual Distance (km) <span className="required">*</span></label>
              <input type="number" className="form-input" value={completeForm.actual_distance_km}
                onChange={e => setCompleteForm(f => ({ ...f, actual_distance_km: e.target.value }))} min="1" />
            </div>
            <div className="form-group">
              <label className="form-label">Fuel Consumed (Liters)</label>
              <input type="number" className="form-input" placeholder="18.5" value={completeForm.fuel_consumed_l}
                onChange={e => setCompleteForm(f => ({ ...f, fuel_consumed_l: e.target.value }))} min="0" step="0.1" />
            </div>
          </div>
        )}
      </Modal>

      {/* View Trip Modal */}
      <Modal isOpen={viewModal.open} onClose={() => setViewModal({ open: false, trip: null })} title="Trip Details"
        footer={<button className="btn btn-secondary" onClick={() => setViewModal({ open: false, trip: null })}>Close</button>}
      >
        {viewModal.trip && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              ['Route', `${viewModal.trip.source} → ${viewModal.trip.destination}`],
              ['Vehicle', `${viewModal.trip.registration_number} (${viewModal.trip.vehicle_name})`],
              ['Driver', viewModal.trip.driver_name],
              ['Cargo Weight', `${parseFloat(viewModal.trip.cargo_weight_kg)} kg`],
              ['Planned Distance', `${parseFloat(viewModal.trip.planned_distance_km)} km`],
              ['Actual Distance', viewModal.trip.actual_distance_km ? `${viewModal.trip.actual_distance_km} km` : '—'],
              ['Fuel Consumed', viewModal.trip.fuel_consumed_l ? `${viewModal.trip.fuel_consumed_l} L` : '—'],
              ['Revenue', `₹${parseFloat(viewModal.trip.revenue || 0).toLocaleString('en-IN')}`],
              ['Status', viewModal.trip.status],
              ['Created', format(new Date(viewModal.trip.created_at), 'dd MMM yyyy HH:mm')],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {label === 'Status' ? <StatusBadge status={value} /> : value}
                </span>
              </div>
            ))}
            {viewModal.trip.notes && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>Notes</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {viewModal.trip.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
