import { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import { LoadingSpinner, EmptyState } from '../components/UI';
import { Plus, Fuel, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const emptyFuel = { vehicle_id: '', trip_id: '', liters: '', cost_per_liter: '', date: new Date().toISOString().split('T')[0], odometer_reading: '' };
const emptyExpense = { vehicle_id: '', trip_id: '', category: 'Toll', amount: '', description: '', date: new Date().toISOString().split('T')[0] };
const EXPENSE_CATS = ['Toll', 'Maintenance', 'Insurance', 'Other'];

export default function FuelExpenses() {
  const [tab, setTab] = useState('fuel');
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fuelModal, setFuelModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [fuelForm, setFuelForm] = useState(emptyFuel);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [fRes, eRes, vRes, tRes] = await Promise.all([
        api.get('/fuel'),
        api.get('/expenses'),
        api.get('/vehicles'),
        api.get('/trips'),
      ]);
      setFuelLogs(fRes.data.data);
      setExpenses(eRes.data.data);
      setVehicles(vRes.data.data);
      setTrips(tRes.data.data.filter(t => ['Dispatched', 'Completed'].includes(t.status)));
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    if (!fuelForm.vehicle_id || !fuelForm.liters || !fuelForm.cost_per_liter) {
      toast.error('Vehicle, liters, and cost per liter are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/fuel', fuelForm);
      toast.success('Fuel log recorded!');
      setFuelModal(false);
      setFuelForm(emptyFuel);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.vehicle_id || !expenseForm.amount) {
      toast.error('Vehicle and amount are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/expenses', expenseForm);
      toast.success('Expense recorded!');
      setExpenseModal(false);
      setExpenseForm(emptyExpense);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const totalFuelCost = fuelLogs.reduce((s, l) => s + parseFloat(l.total_cost || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const ff = (key, val) => setFuelForm(p => ({ ...p, [key]: val }));
  const ef = (key, val) => setExpenseForm(p => ({ ...p, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Fuel & Expenses</h1>
          <p>Operational cost tracking and fuel consumption logs</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button id="add-fuel-btn" className="btn btn-primary" onClick={() => setFuelModal(true)}>
            <Plus size={16} /> Log Fuel
          </button>
          <button id="add-expense-btn" className="btn btn-secondary" onClick={() => setExpenseModal(true)}>
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent"><Fuel size={20} /></div>
          <div className="kpi-value">₹{totalFuelCost.toLocaleString('en-IN')}</div>
          <div className="kpi-label">Total Fuel Cost</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning"><Receipt size={20} /></div>
          <div className="kpi-value">₹{totalExpenses.toLocaleString('en-IN')}</div>
          <div className="kpi-label">Total Other Expenses</div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger"><Receipt size={20} /></div>
          <div className="kpi-value">₹{(totalFuelCost + totalExpenses).toLocaleString('en-IN')}</div>
          <div className="kpi-label">Total Operational Cost</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content', border: '1px solid var(--border)' }}>
        {[['fuel', 'Fuel Logs', <Fuel size={14} />], ['expenses', 'Expenses', <Receipt size={14} />]].map(([key, label, icon]) => (
          <button key={key} id={`tab-${key}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
              borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === key ? 'var(--primary)' : 'transparent',
              color: tab === key ? 'white' : 'var(--text-secondary)',
              transition: 'all 150ms'
            }}
            onClick={() => setTab(key)}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Tables */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? <LoadingSpinner /> : (
          tab === 'fuel' ? (
            fuelLogs.length === 0 ? <EmptyState icon={Fuel} title="No fuel logs" description="Log your first fuel fill-up." /> :
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Date</th>
                      <th>Liters</th>
                      <th>Cost/Liter</th>
                      <th>Total Cost</th>
                      <th>Odometer</th>
                      <th>Trip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelLogs.map(l => (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{l.registration_number}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.vehicle_name}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{format(new Date(l.date), 'dd MMM yyyy')}</td>
                        <td style={{ fontWeight: 600 }}>{parseFloat(l.liters)} L</td>
                        <td style={{ fontSize: 13 }}>₹{parseFloat(l.cost_per_liter).toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>₹{parseFloat(l.total_cost || 0).toLocaleString('en-IN')}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{l.odometer_reading ? `${l.odometer_reading} km` : '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.source ? `${l.source} → ${l.destination}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          ) : (
            expenses.length === 0 ? <EmptyState icon={Receipt} title="No expenses recorded" description="Track operational costs by adding expenses." /> :
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Trip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{e.registration_number}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.vehicle_name}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{format(new Date(e.date), 'dd MMM yyyy')}</td>
                        <td><span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)' }}>{e.category}</span></td>
                        <td style={{ fontWeight: 700, color: 'var(--warning-light)' }}>₹{parseFloat(e.amount).toLocaleString('en-IN')}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e.description || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.source ? `${e.source} → ${e.destination}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )
        )}
      </div>

      {/* Fuel Modal */}
      <Modal isOpen={fuelModal} onClose={() => setFuelModal(false)} title="Log Fuel Fill-up"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setFuelModal(false)}>Cancel</button>
            <button id="fuel-save-btn" className="btn btn-primary" onClick={handleFuelSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save Fuel Log'}</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group form-full">
            <label className="form-label">Vehicle <span className="required">*</span></label>
            <select className="form-select" value={fuelForm.vehicle_id} onChange={e => ff('vehicle_id', e.target.value)}>
              <option value="">Select vehicle...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} — {v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Liters <span className="required">*</span></label>
            <input type="number" className="form-input" placeholder="40" value={fuelForm.liters} onChange={e => ff('liters', e.target.value)} step="0.1" min="0.1" />
          </div>
          <div className="form-group">
            <label className="form-label">Cost per Liter (₹) <span className="required">*</span></label>
            <input type="number" className="form-input" placeholder="95.50" value={fuelForm.cost_per_liter} onChange={e => ff('cost_per_liter', e.target.value)} step="0.01" min="0" />
          </div>
          {fuelForm.liters && fuelForm.cost_per_liter && (
            <div className="form-group form-full">
              <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', padding: '8px 14px', borderRadius: 8, fontSize: 13, color: 'var(--accent-light)' }}>
                Total Cost: <strong>₹{(parseFloat(fuelForm.liters) * parseFloat(fuelForm.cost_per_liter)).toFixed(2)}</strong>
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={fuelForm.date} onChange={e => ff('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Odometer Reading (km)</label>
            <input type="number" className="form-input" placeholder="12500" value={fuelForm.odometer_reading} onChange={e => ff('odometer_reading', e.target.value)} />
          </div>
          <div className="form-group form-full">
            <label className="form-label">Link to Trip (optional)</label>
            <select className="form-select" value={fuelForm.trip_id} onChange={e => ff('trip_id', e.target.value)}>
              <option value="">No trip</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.source} → {t.destination} ({t.status})</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Expense Modal */}
      <Modal isOpen={expenseModal} onClose={() => setExpenseModal(false)} title="Record Expense"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setExpenseModal(false)}>Cancel</button>
            <button id="expense-save-btn" className="btn btn-primary" onClick={handleExpenseSubmit} disabled={saving}>{saving ? 'Saving...' : 'Record Expense'}</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group form-full">
            <label className="form-label">Vehicle <span className="required">*</span></label>
            <select className="form-select" value={expenseForm.vehicle_id} onChange={e => ef('vehicle_id', e.target.value)}>
              <option value="">Select vehicle...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} — {v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Category <span className="required">*</span></label>
            <select className="form-select" value={expenseForm.category} onChange={e => ef('category', e.target.value)}>
              {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹) <span className="required">*</span></label>
            <input type="number" className="form-input" placeholder="250" value={expenseForm.amount} onChange={e => ef('amount', e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={expenseForm.date} onChange={e => ef('date', e.target.value)} />
          </div>
          <div className="form-group form-full">
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="e.g. Mumbai-Pune expressway toll" value={expenseForm.description} onChange={e => ef('description', e.target.value)} />
          </div>
          <div className="form-group form-full">
            <label className="form-label">Link to Trip (optional)</label>
            <select className="form-select" value={expenseForm.trip_id} onChange={e => ef('trip_id', e.target.value)}>
              <option value="">No trip</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.source} → {t.destination}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
