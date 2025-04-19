'use client';

import { useState, useEffect } from 'react';
import { ConnectionForm } from '@/components/database/connection-form';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EnhancedTableView } from '@/components/database/enhanced-table-view';
import { EnhancedRLSView } from '@/components/database/enhanced-rls-view';
import { QueryView } from '@/components/database/query-view';
import { useDatabaseStore } from '@/lib/store';
import { ToastProvider } from '@/components/ui/toast';

export default function Home() {
  const { status, currentTab } = useDatabaseStore();
  const [mounted, setMounted] = useState(false);

  // Ensure hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ToastProvider>
      <main className="min-h-screen">
        {status !== 'connected' ? (
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-2xl">
              <h1 className="text-3xl font-bold mb-8 text-center">Database Viewer</h1>
              <ConnectionForm />
            </div>
          </div>
        ) : (
          <DashboardLayout>
            {currentTab === 'tables' ? <EnhancedTableView /> : 
             currentTab === 'rls' ? <EnhancedRLSView /> : 
             <QueryView />}
          </DashboardLayout>
        )}
      </main>
    </ToastProvider>
  );
}
