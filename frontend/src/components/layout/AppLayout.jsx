import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream-base text-ink-primary font-sans flex flex-col">
      {/* Sidebar (Desktop Persistent & Mobile Drawer) */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area shifted right on desktop */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Header */}
        <Header onOpenMobile={() => setMobileOpen(true)} />

        {/* Content Container */}
        <main className="pt-14 px-4 sm:px-6 md:px-8 pb-12 flex-1 w-full max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

