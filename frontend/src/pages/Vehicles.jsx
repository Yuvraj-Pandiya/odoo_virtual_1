import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { StatusBadge, LoadingSpinner, EmptyState } from '../components/UI';
import { Plus, Search, Edit2, Trash2, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

const VEHICLE_TYPES = ['Truck', 'Van', 'Car', 'Motorcycle', 'Bus', 'Trailer'];
const STATUS_OPTIONS = ['Available', 'In Shop', 'Retired'];

const emptyForm = {
  registration_number: '', name: '', model: '', type: 'Truck',
  max_load_kg: '', odometer_km: '', acquisition_cost: '', status: 'Available', region: ''
};

export default function Vehicles() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('fleet_manager');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'create', data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: '', type: '', search: '' });

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;
      const { data } = await api.get('/vehicles', { params });
      setVehicles(data.data);
    } catch (err) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const openCreate = () => {
    setForm(emptyForm);
    setModal({ open: true, mode: 'create', data: null });
  };

  const openEdit = (v) => {
    setForm({
      registration_number: v.registration_number,
      name: v.name, model: v.model || '', type: v.type,
      max_load_kg: v.max_load_kg, odometer_km: v.odometer_km,
      acquisition_cost: v.acquisition_cost, status: v.status, region: v.region || ''
    });
    setModal({ open: true, mode: 'edit', data: v });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.registration_number || !form.name || !form.max_load_kg || !form.acquisition_cost) {
      toast.error('Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.post('/vehicles', form);
        toast.success('Vehicle created successfully!');
      } else {
        await api.put(`/vehicles/${modal.data.id}`, form);
        toast.success('Vehicle updated!');
      }
      setModal(m => ({ ...m, open: false }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      toast.success('Vehicle deleted.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete vehicle.');
    }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Vehicle Registry</h1>
          <p>Manage your fleet's vehicles and their status</p>
        </div>
        {canEdit && (
          <button id="add-vehicle-btn" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Vehicle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            id="vehicle-search"
            placeholder="Search by reg. number or name..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select id="vehicle-status-filter" className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {['Available', 'On Trip', 'In Shop', 'Retired'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select id="vehicle-type-filter" className="filter-select" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : vehicles.length === 0 ? (
          <EmptyState icon={Truck} title="No vehicles found" description="Add your first vehicle to get started." />
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Max Load</th>
                  <th>Odometer</th>
                  <th>Acq. Cost</th>
                  <th>Region</th>
                  <th>Status</th>
                  <th>Op. Cost</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td><span className="font-mono" style={{ color: 'var(--primary-light)', fontSize: 13 }}>{v.registration_number}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.model}</div>
                    </td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.type}</span></td>
                    <td>{parseFloat(v.max_load_kg).toLocaleString()} kg</td>
                    <td>{parseFloat(v.odometer_km).toLocaleString()} km</td>
                    <td>₹{parseFloat(v.acquisition_cost).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{v.region || '—'}</td>
                    <td><StatusBadge status={v.status} /></td>
                    <td style={{ fontSize: 13 }}>
                      ₹{(parseFloat(v.total_fuel_cost || 0) + parseFloat(v.total_maintenance_cost || 0)).toLocaleString('en-IN')}
                    </td>
                    {canEdit && (
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button id={`edit-vehicle-${v.id}`} className="btn btn-sm btn-secondary" onClick={() => openEdit(v)}><Edit2 size={13} /></button>
                          <button id={`del-vehicle-${v.id}`} className="btn btn-sm btn-danger" onClick={() => handleDelete(v.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        title={modal.mode === 'create' ? 'Register New Vehicle' : 'Edit Vehicle'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</button>
            <button id="vehicle-save-btn" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : modal.mode === 'create' ? 'Register Vehicle' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Registration Number <span className="required">*</span></label>
            <input className="form-input" placeholder="e.g. TRK-001" value={form.registration_number}
              onChange={e => f('registration_number', e.target.value.toUpperCase())}
              disabled={modal.mode === 'edit'} />
          </div>
          <div className="form-group">
            <label className="form-label">Vehicle Name <span className="required">*</span></label>
            <input className="form-input" placeholder="e.g. Titan Hauler" value={form.name} onChange={e => f('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Model</label>
            <input className="form-input" placeholder="e.g. Ford F-650" value={form.model} onChange={e => f('model', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Type <span className="required">*</span></label>
            <select className="form-select" value={form.type} onChange={e => f('type', e.target.value)}>
              {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Max Load Capacity (kg) <span className="required">*</span></label>
            <input type="number" className="form-input" placeholder="500" value={form.max_load_kg} onChange={e => f('max_load_kg', e.target.value)} min="1" />
          </div>
          <div className="form-group">
            <label className="form-label">Odometer (km)</label>
            <input type="number" className="form-input" placeholder="0" value={form.odometer_km} onChange={e => f('odometer_km', e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Acquisition Cost (₹) <span className="required">*</span></label>
            <input type="number" className="form-input" placeholder="75000" value={form.acquisition_cost} onChange={e => f('acquisition_cost', e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Region</label>
            <input className="form-input" placeholder="e.g. North" value={form.region} onChange={e => f('region', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => f('status', e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
