
import React from 'react';
import Sidebar from './Sidebar';
import { motion } from "motion/react"

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;