'use client';

import { ReactNode } from 'react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import * as Tabs from '@radix-ui/react-tabs';
import { useDatabaseStore } from '@/lib/store';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { tables, currentTable, currentTab, setCurrentTable, setCurrentTab } = useDatabaseStore();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-background border-r overflow-y-auto">
        <div className="p-4">
          <h1 className="text-xl font-bold mb-4">Database Viewer</h1>
          
          <NavigationMenu.Root className="relative">
            <NavigationMenu.List className="flex flex-col space-y-1">
              {tables.map((table) => (
                <NavigationMenu.Item key={table}>
                  <NavigationMenu.Trigger
                    className={`px-3 py-2 rounded-md text-sm font-medium ${currentTable === table ? 'bg-foreground text-background' : 'hover:bg-foreground/10'}`}
                    onClick={() => setCurrentTable(table)}
                  >
                    {table}
                  </NavigationMenu.Trigger>
                </NavigationMenu.Item>
              ))}
              
              {tables.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No tables found
                </div>
              )}
            </NavigationMenu.List>
          </NavigationMenu.Root>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <Tabs.Root
          value={currentTab}
          onValueChange={(value) => setCurrentTab(value as 'tables' | 'rls' | 'query')}
          className="border-b"
        >
          <Tabs.List className="flex">
            <Tabs.Trigger
              value="tables"
              className={`px-4 py-2 text-sm font-medium border-b-2 ${currentTab === 'tables' ? 'border-foreground' : 'border-transparent hover:border-foreground/30'}`}
            >
              Tables
            </Tabs.Trigger>
            <Tabs.Trigger
              value="rls"
              className={`px-4 py-2 text-sm font-medium border-b-2 ${currentTab === 'rls' ? 'border-foreground' : 'border-transparent hover:border-foreground/30'}`}
            >
              RLS
            </Tabs.Trigger>
            <Tabs.Trigger
              value="query"
              className={`px-4 py-2 text-sm font-medium border-b-2 ${currentTab === 'query' ? 'border-foreground' : 'border-transparent hover:border-foreground/30'}`}
            >
              Query
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}