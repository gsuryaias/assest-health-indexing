import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, BookOpen, PieChart, Zap } from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Fleet Overview' },
  { to: '/analytics', icon: PieChart, label: 'Fleet Analytics' },
  { to: '/models', icon: BarChart3, label: 'Model Performance' },
  { to: '/methodology', icon: BookOpen, label: 'Methodology' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-slate-900 text-white flex flex-col z-40">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-sm">AP Transco DGA</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Transformer Health Dashboard</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <p className="text-[10px] text-slate-500">Phase A &middot; Local Analysis</p>
        <p className="text-[10px] text-slate-500">IEEE C57.104-2019 &middot; IEC 60599</p>
        <p className="text-[9px] text-slate-600 mt-2">
          Proof of concept by{' '}
          <a
            href="https://www.linkedin.com/in/praveenchandgss"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-blue-400 hover:underline"
          >
            Surya Praveenchand, IAS
          </a>
          <br />JMD AP Transco
        </p>
      </div>
    </aside>
  );
}
