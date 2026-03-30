import { Routes, Route } from 'react-router-dom';
import { DashboardProvider } from './context/DashboardContext';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import FleetOverview from './pages/FleetOverview';
import SubstationView from './pages/SubstationView';
import TransformerDetail from './pages/TransformerDetail';
import ModelPerformance from './pages/ModelPerformance';
import Methodology from './pages/Methodology';
import Analytics from './pages/Analytics';
import Report from './pages/Report';
import FleetReport from './pages/FleetReport';

export default function App() {
  return (
    <DashboardProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 ml-56">
          <TopBar />
          <main className="p-6">
            <Routes>
              <Route path="/" element={<FleetOverview />} />
              <Route path="/substation/:id" element={<SubstationView />} />
              <Route path="/transformer/:id" element={<TransformerDetail />} />
              <Route path="/models" element={<ModelPerformance />} />
              <Route path="/methodology" element={<Methodology />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/report/:id" element={<Report />} />
              <Route path="/fleet-report" element={<FleetReport />} />
            </Routes>
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}
