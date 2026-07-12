import { useEffect, useState } from 'react';
import api from '../api/client';
import { LoadingSpinner } from '../components/UI';
import {
  Truck, Users, Route, AlertTriangle, CheckCircle, Clock, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#FF3E41', '#51CFED', '#10b981', '#f59e0b', '#ef4444'];

function KPICard({ icon: Icon, value, label, color = 'primary', sub }) {
  return (
    <div className="logistica-card">
      <div className="d-flex align-items-center mb-3">
        <div style={{ width: 44, height: 44, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `var(--logistica-${color === 'accent' || color === 'info' ? 'secondary' : 'primary'})`, color: 'white' }}>
          <Icon size={22} />
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text-muted)', fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: '4px', padding: '10px 14px', fontSize: 13, boxShadow: 'var(--card-shadow)'
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600, margin: 0 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [trends, setTrends] = useState([]);
  const [fuelEff, setFuelEff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [kpiRes, trendRes, fuelRes] = await Promise.all([
          api.get('/reports/dashboard-kpis'),
          api.get('/reports/trip-trends'),
          api.get('/reports/fuel-efficiency'),
        ]);
        setKpis(kpiRes.data.data);
        setTrends(trendRes.data.data);
        setFuelEff(fuelRes.data.data.slice(0, 6));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!kpis) return null;

  const { vehicles, trips, drivers, fleet_utilization_pct } = kpis;

  const vehicleStatusData = [
    { name: 'Available', value: parseInt(vehicles.available_vehicles) },
    { name: 'On Trip', value: parseInt(vehicles.on_trip_vehicles) },
    { name: 'In Shop', value: parseInt(vehicles.in_shop_vehicles) },
    { name: 'Retired', value: parseInt(vehicles.retired_vehicles) },
  ].filter(d => d.value > 0);

  return (
    <div>
      <div className="page-banner" style={{ backgroundImage: 'url(/img/carousel-1.jpg)' }}>
        <div className="page-banner-content">
          <h2>Welcome to TransitOps Dashboard</h2>
          <p>Monitor your fleet's operations, performance, and key metrics in real-time.</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KPICard icon={Truck} value={vehicles.total_vehicles} label="Total Vehicles" color="primary" sub={`${vehicles.available_vehicles} available`} />
        <KPICard icon={Activity} value={`${fleet_utilization_pct}%`} label="Fleet Utilization" color="accent" sub="Active ratio" />
        <KPICard icon={Route} value={trips.active_trips} label="Active Trips" color="info" sub={`${trips.pending_trips} pending`} />
        <KPICard icon={CheckCircle} value={trips.completed_trips} label="Completed Trips" color="success" sub="All time" />
        <KPICard icon={Users} value={drivers.total_drivers} label="Total Drivers" color="primary" sub={`${drivers.on_duty_drivers} on duty`} />
        <KPICard icon={AlertTriangle} value={vehicles.in_shop_vehicles} label="In Maintenance" color="warning" sub="Vehicles in shop" />
        <KPICard icon={Clock} value={drivers.expiring_soon} label="Licenses Expiring" color="danger" sub="Within 30 days" />
        <KPICard
          icon={CheckCircle}
          value={`₹${parseFloat(trips.total_revenue || 0).toLocaleString('en-IN')}`}
          label="Total Revenue"
          color="success"
          sub="Completed trips"
        />
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Trip Trends */}
        <div className="logistica-card">
          <h4 style={{ marginBottom: 24, fontSize: 18 }}>Trip Trends (Last 6 Months)</h4>
          {trends.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No trend data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trends} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--logistica-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--logistica-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="var(--logistica-primary)" fill="url(#colorCompleted)" strokeWidth={2} />
                <Area type="monotone" dataKey="cancelled" name="Cancelled" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Vehicle Status Pie */}
        <div className="logistica-card">
          <h4 style={{ marginBottom: 24, fontSize: 18 }}>Fleet Status Distribution</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={vehicleStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="value">
                {vehicleStatusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Fuel Efficiency */}
        <div className="logistica-card" style={{ gridColumn: '1 / -1' }}>
          <h4 style={{ marginBottom: 24, fontSize: 18 }}>Fuel Efficiency by Vehicle (km/L)</h4>
          {fuelEff.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No fuel data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fuelEff} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="registration_number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit=" km/L" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="km_per_liter" name="Efficiency" fill="var(--logistica-secondary)" radius={[4, 4, 0, 0]}>
                  {fuelEff.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? 'var(--logistica-secondary)' : 'var(--logistica-primary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Driver License Expiry Alert */}
      {parseInt(drivers.expiring_soon) > 0 && (
        <div className="logistica-alert logistica-alert-warning" style={{ marginTop: 8 }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>{drivers.expiring_soon} driver(s)</strong> have licenses expiring within 30 days.
            Visit Driver Management to review compliance.
          </span>
        </div>
      )}
    </div>
  );
}
