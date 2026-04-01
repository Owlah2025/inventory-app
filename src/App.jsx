import React from 'react';
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Settings2, Building2, Store, Download } from 'lucide-react';
import ModelsPage from './pages/ModelsPage';
import ShopsPage from './pages/ShopsPage';
import SettingsPage from './pages/SettingsPage';
import WarehousePage from './pages/WarehousePage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<ModelsPage />} />
          <Route path="/warehouse" element={<WarehousePage />} />
          <Route path="/shops" element={<ShopsPage />} />
          <Route path="/export" element={<SettingsPage />} />
        </Routes>

        <nav className="bottom-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings2 size={24} />
            <span>Inventory</span>
          </NavLink>
          <NavLink to="/warehouse" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Building2 size={24} />
            <span>Distribution</span>
          </NavLink>
          <NavLink to="/shops" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Store size={24} />
            <span>Shops</span>
          </NavLink>
          <NavLink to="/export" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Download size={24} />
            <span>Export</span>
          </NavLink>
        </nav>
      </div>
    </Router>
  );
}

export default App;
