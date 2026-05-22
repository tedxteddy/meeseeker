interface SidebarProps {
  activeSection: string
  onNavigate: (section: string) => void
}

const navItems = [
  { key: 'overview', label: 'Overview' },
  { key: 'resume', label: 'Resume Analysis' },
  { key: 'jobs', label: 'Job Matches' },
  { key: 'import', label: 'Import Jobs' },
  { key: 'pipeline', label: 'Applications' },
  { key: 'network', label: 'Networking' },
  { key: 'growth', label: 'Growth Plan' },
]

export default function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">CI</span>
        <div>
          <strong>Career Intel</strong>
          <span>Local Dashboard</span>
        </div>
      </div>
      <nav aria-label="Dashboard sections">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`nav-item ${activeSection === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
