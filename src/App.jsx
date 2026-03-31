import React from 'react';
import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Shirt, Store, Download } from 'lucide-react';
import ModelsPage from './pages/ModelsPage';
import ShopsPage from './pages/ShopsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<ModelsPage />} />
          <Route path="/shops" element={<ShopsPage />} />
          <Route path="/export" element={<SettingsPage />} />
        </Routes>

        <nav className="bottom-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Shirt size={24} />
            <span>Inventory</span>
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
