import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export default function TopBar() {
  const location = useLocation();
  const { state } = useDashboard();
  const path = location.pathname;

  const crumbs = [{ label: 'Fleet Overview', to: '/' }];

  // Parse route params from pathname
  const substationMatch = path.match(/^\/substation\/(.+)/);
  const transformerMatch = path.match(/^\/transformer\/(.+)/);

  if (substationMatch) {
    const id = decodeURIComponent(substationMatch[1]);
    const sub = state.substations.find(s => s.id === id);
    crumbs.push({ label: sub?.name || id, to: path });
  }

  if (transformerMatch) {
    const id = decodeURIComponent(transformerMatch[1]);
    const tr = state.transformers.find(t => t.equipment_no === id);
    if (tr?.substation_id) {
      const sub = state.substations.find(s => s.id === tr.substation_id);
      crumbs.push({ label: sub?.name || tr.substation_id, to: `/substation/${tr.substation_id}` });
    }
    crumbs.push({ label: `Transformer ${id}`, to: path });
  }

  if (path === '/models') {
    crumbs.push({ label: 'Model Performance', to: '/models' });
  }

  if (path === '/methodology') {
    crumbs.push({ label: 'Methodology', to: '/methodology' });
  }

  if (path === '/analytics') {
    crumbs.push({ label: 'Fleet Analytics', to: '/analytics' });
  }

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-30">
      <nav className="flex items-center text-sm text-gray-500">
        {crumbs.map((crumb, i) => (
          <span key={crumb.to} className="flex items-center">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-gray-400" />}
            {i === crumbs.length - 1 ? (
              <span className="text-gray-900 font-medium truncate max-w-xs">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="hover:text-gray-700 transition-colors truncate max-w-xs">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </header>
  );
}
