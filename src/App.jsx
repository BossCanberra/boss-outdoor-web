import React, { useState } from 'react';
import HomeScreen from './HomeScreen';
import BragBoard from './BragBoard';
import VoucherDraw from './VoucherDraw';
import CanberraDashboard from './CanberraDashboard';
import MerimbulaDashboard from './MerimbulaDashboard';
import AdminDashboard from './AdminDashboard';
import WaterTelemetry from './WaterTelemetry'; 
import SolunarPlanner from './SolunarPlanner';

export default function App() {
  const [view, setView] = useState('home');

  // 🎯 FIXED: Dynamically pulls the active store context from what was clicked
  const getActiveStoreContext = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('boss_active_store_context') || 'Canberra';
    }
    return 'Canberra';
  };

  return (
    <>
      {/* Core Base Views */}
      {view === 'home' && (
        <HomeScreen 
          onNavigate={(targetView) => {
            // Automatically set context when jumping directly into a main store view from Home
            if (targetView === 'canberra') {
              localStorage.setItem('boss_active_store_context', 'Canberra');
            } else if (targetView === 'merimbula') {
              localStorage.setItem('boss_active_store_context', 'Merimbula');
            }
            setView(targetView);
          }} 
        />
      )}
      
      {/* Dynamic Navigation States based on Active Store Context */}
      {view === 'bragboard' && <BragBoard storeLocation={getActiveStoreContext()} onBack={() => setView(getActiveStoreContext().toLowerCase())} />}
      {view === 'gallery' && <VoucherDraw storeLocation={getActiveStoreContext()} onBack={() => setView(getActiveStoreContext().toLowerCase())} />}

      {/* Main Storefront Dashboards */}
      {view === 'canberra' && <CanberraDashboard onBack={() => setView('home')} onNavigate={setView} />}
      {view === 'merimbula' && <MerimbulaDashboard onBack={() => setView('home')} onNavigate={setView} />}

      {/* Admin Panel Space */}
      {view === 'admin' && <AdminDashboard onBack={() => setView('home')} />}
      
      {/* Canberra Catchment Water Telemetry Module */}
      {view === 'canberra_water' && <WaterTelemetry onBack={() => setView('canberra')} />}
      
      {/* Solunar 7-Day Planner Nodes */}
      {view === 'canberra_solunar' && <SolunarPlanner storeLocation="Canberra" onBack={() => setView('canberra')} />}
      {view === 'merimbula_solunar' && <SolunarPlanner storeLocation="Merimbula" onBack={() => setView('merimbula')} />}
    </>
  );
}