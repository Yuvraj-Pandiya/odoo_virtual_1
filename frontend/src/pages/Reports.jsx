import { useEffect, useState } from 'react';
import api from '../api/client';
import { LoadingSpinner } from '../components/UI';
import { Download, BarChart3, TrendingUp, DollarSign, Percent } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Reports() {
  const [tab, setTab] = useState('fuel');
  const [fuelData, setFuelData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [roiData, setROIData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [fRes, cRes, rRes] = await Promise.all([
          api.get('/reports/fuel-efficiency'),
          api.get('/reports/operational-cost'),
          api.get('/reports/vehicle-roi'),
        ]);
        setFuelData(fRes.data.data);
        setCostData(cRes.data.data);
        setROIData(rRes.data.data);
      } catch (err) {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const exportCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(99, 102, 241);
    doc.text('TransitOps — Analytics Report', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Fuel Efficiency
    doc.setFontSize(13);
    doc.setTextColor(33);
    doc.text('Fuel Efficiency by Vehicle', 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [['Vehicle', 'Reg. No.', 'Total Liters', 'Total Distance (km)', 'Efficiency (km/L)', 'Fuel Cost (₹)']],
      body: fuelData.map(r => [r.name, r.registration_number, parseFloat(r.total_liters).toFixed(1), parseFloat(r.total_distance).toFixed(1), parseFloat(r.km_per_liter).toFixed(2), parseFloat(r.total_fuel_cost).toLocaleString()]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [99, 102, 241] },
    });

    // Operational Cost
    doc.addPage();
    doc.setFontSize(13);
    doc.setTextColor(33);
    doc.text('Operational Cost by Vehicle', 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [['Vehicle', 'Fuel Cost (₹)', 'Maintenance (₹)', 'Other (₹)', 'Total (₹)']],
      body: costData.map(r => [r.registration_number, parseFloat(r.fuel_cost).toLocaleString(), parseFloat(r.maintenance_cost).toLocaleString(), parseFloat(r.other_expenses).toLocaleString(), parseFloat(r.total_operational_cost).toLocaleString()]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [99, 102, 241] },
    });

    // ROI
    doc.addPage();
    doc.setFontSize(13);
    doc.setTextColor(33);
    doc.text('Vehicle ROI Analysis', 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [['Vehicle', 'Acquisition (₹)', 'Revenue (₹)', 'Fuel Cost (₹)', 'Maint. Cost (₹)', 'ROI (%)']],
      body: roiData.map(r => [r.registration_number, parseFloat(r.acquisition_cost).toLocaleString(), parseFloat(r.total_revenue).toLocaleString(), parseFloat(r.fuel_cost).toLocaleString(), parseFloat(r.maintenance_cost).toLocaleString(), parseFloat(r.roi_pct).toFixed(2) + '%']),
      styles: { fontSize: 9 }, headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save('TransitOps_Analytics_Report.pdf');
    toast.success('PDF report exported!');
  };

  const tabs = [
    { key: 'fuel', label: 'Fuel Efficiency', icon: <TrendingUp size={14} /> },
    { key: 'cost', label: 'Operational Cost', icon: <DollarSign size={14} /> },
    { key: 'roi', label: 'Vehicle ROI', icon: <Percent size={14} /> },
  ];

  const activeData = tab === 'fuel' ? fuelData : tab === 'cost' ? costData : roiData;

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-muted">Fleet performance, cost analysis, and ROI insights</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button id="export-csv-btn" className="btn-logistica-secondary"
            onClick={() => exportCSV(activeData, `transitops_${tab}_report`)}>
            <Download size={15} /> Export CSV
          </button>
          <button id="export-pdf-btn" className="btn-logistica" onClick={exportPDF}>
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-main)', padding: 4, borderRadius: 8, width: 'fit-content', border: '1px solid var(--border-color)' }}>
        {tabs.map(({ key, label, icon }) => (
          <button key={key} id={`report-tab-${key}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
              borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === key ? 'var(--logistica-primary)' : 'transparent',
              color: tab === key ? 'white' : 'var(--text-muted)',
              transition: 'all 150ms', fontFamily: 'inherit'
            }}
            onClick={() => setTab(key)}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Fuel Efficiency */}
          {tab === 'fuel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="logistica-card">
                <h4 style={{ marginBottom: 24, fontSize: 18 }}>Fuel Efficiency (km per Liter) by Vehicle</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={fuelData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="registration_number" tick={{ fill: '#64748b', fontSize: 11 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" km/L" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="km_per_liter" name="km/L" radius={[4, 4, 0, 0]}>
                      {fuelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="logistica-card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                  <h5 style={{ margin: 0 }}>Fuel Efficiency Details</h5>
                </div>
                <div className="logistica-table-container">
                  <table className="logistica-table">
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Reg. No.</th>
                        <th>Total Fuel (L)</th>
                        <th>Total Distance</th>
                        <th>Efficiency</th>
                        <th>Fuel Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fuelData.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td><span className="font-mono" style={{ color: 'var(--primary-light)', fontSize: 12 }}>{r.registration_number}</span></td>
                          <td>{parseFloat(r.total_liters).toFixed(1)} L</td>
                          <td>{parseFloat(r.total_distance).toFixed(0)} km</td>
                          <td>
                            <span style={{ fontWeight: 700, color: parseFloat(r.km_per_liter) > 10 ? 'var(--success-light)' : parseFloat(r.km_per_liter) > 5 ? 'var(--warning-light)' : 'var(--danger-light)' }}>
                              {parseFloat(r.km_per_liter).toFixed(2)} km/L
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>₹{parseFloat(r.total_fuel_cost).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Operational Cost */}
          {tab === 'cost' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="logistica-card">
                <h4 style={{ marginBottom: 24, fontSize: 18 }}>Operational Cost Breakdown by Vehicle</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={costData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="registration_number" tick={{ fill: '#64748b', fontSize: 11 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                    <Bar dataKey="fuel_cost" name="Fuel Cost" stackId="a" fill="#6366f1" />
                    <Bar dataKey="maintenance_cost" name="Maintenance" stackId="a" fill="#06b6d4" />
                    <Bar dataKey="other_expenses" name="Other" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="logistica-card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                  <h5 style={{ margin: 0 }}>Cost Details per Vehicle</h5>
                </div>
                <div className="logistica-table-container">
                  <table className="logistica-table">
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Fuel Cost</th>
                        <th>Maintenance</th>
                        <th>Other</th>
                        <th>Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costData.map(r => (
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.registration_number}</div>
                          </td>
                          <td>₹{parseFloat(r.fuel_cost).toLocaleString('en-IN')}</td>
                          <td>₹{parseFloat(r.maintenance_cost).toLocaleString('en-IN')}</td>
                          <td>₹{parseFloat(r.other_expenses).toLocaleString('en-IN')}</td>
                          <td style={{ fontWeight: 700, color: 'var(--danger-light)' }}>
                            ₹{parseFloat(r.total_operational_cost).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Vehicle ROI */}
          {tab === 'roi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="logistica-card">
                <h4 style={{ marginBottom: 24, fontSize: 18 }}>Vehicle ROI % — (Revenue − Costs) / Acquisition Cost × 100</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={roiData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="registration_number" tick={{ fill: '#64748b', fontSize: 11 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="roi_pct" name="ROI %" radius={[4, 4, 0, 0]}>
                      {roiData.map((r, i) => (
                        <Cell key={i} fill={parseFloat(r.roi_pct) > 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="logistica-card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                  <h5 style={{ margin: 0 }}>ROI Details</h5>
                </div>
                <div className="logistica-table-container">
                  <table className="logistica-table">
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Acquisition Cost</th>
                        <th>Revenue</th>
                        <th>Fuel Cost</th>
                        <th>Maintenance</th>
                        <th>ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roiData.map(r => (
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.registration_number}</div>
                          </td>
                          <td>₹{parseFloat(r.acquisition_cost).toLocaleString('en-IN')}</td>
                          <td style={{ color: 'var(--success-light)', fontWeight: 600 }}>₹{parseFloat(r.total_revenue).toLocaleString('en-IN')}</td>
                          <td>₹{parseFloat(r.fuel_cost).toLocaleString('en-IN')}</td>
                          <td>₹{parseFloat(r.maintenance_cost).toLocaleString('en-IN')}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: parseFloat(r.roi_pct) >= 0 ? 'var(--success-light)' : 'var(--danger-light)' }}>
                              {parseFloat(r.roi_pct).toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
