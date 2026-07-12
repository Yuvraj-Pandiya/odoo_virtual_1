export function StatusBadge({ status }) {
  const map = {
    'Available': 'badge-available',
    'On Trip': 'badge-on-trip',
    'In Shop': 'badge-in-shop',
    'Retired': 'badge-retired',
    'Off Duty': 'badge-off-duty',
    'Suspended': 'badge-suspended',
    'Draft': 'badge-draft',
    'Dispatched': 'badge-dispatched',
    'Completed': 'badge-completed',
    'Cancelled': 'badge-cancelled',
    'Active': 'badge-active',
    'Closed': 'badge-closed',
  };
  return <span className={`badge ${map[status] || 'badge-draft'}`}>{status}</span>;
}

export function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {Icon && <Icon size={28} />}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
