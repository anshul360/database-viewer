/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { exportToCSV, exportToJSON } from '@/lib/export-utils';

interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  error?: string;
}

interface QueryHistoryItem {
  id: number;
  query: string;
  timestamp: number;
  connectionUrl: string;
  database: string;
  success: boolean;
  rowCount?: number;
}

export function QueryView() {
  const { connection } = useDatabaseStore();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  
  // Initialize IndexedDB
  useEffect(() => {
    initIndexedDB();
    loadQueryHistory();
  }, []);

  const initIndexedDB = () => {
    const request = indexedDB.open('DatabaseViewerDB', 1);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      setError('Failed to initialize query history storage');
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store for query history if it doesn't exist
      if (!db.objectStoreNames.contains('queryHistory')) {
        const store = db.createObjectStore('queryHistory', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('connectionUrl', 'connectionUrl', { unique: false });
      }
    };
  };

  const loadQueryHistory = () => {
    const request = indexedDB.open('DatabaseViewerDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['queryHistory'], 'readonly');
      const store = transaction.objectStore('queryHistory');
      const index = store.index('timestamp');
      const historyRequest = index.openCursor(null, 'prev'); // Sort by timestamp descending
      
      const history: QueryHistoryItem[] = [];
      
      historyRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          // Only load history for the current connection
          if (!connection.url || cursor.value.connectionUrl === connection.url) {
            history.push(cursor.value);
          }
          cursor.continue();
        } else {
          setQueryHistory(history);
        }
      };
      
      historyRequest.onerror = (event) => {
        console.error('Error loading query history:', event);
      };
    };
  };

  const saveQueryToHistory = (queryText: string, success: boolean, rowCount?: number) => {
    if (!connection.url) return;
    
    const request = indexedDB.open('DatabaseViewerDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['queryHistory'], 'readwrite');
      const store = transaction.objectStore('queryHistory');
      
      const historyItem: Omit<QueryHistoryItem, 'id'> = {
        query: queryText,
        timestamp: Date.now(),
        connectionUrl: connection.url,
        database: connection.database,
        success,
        rowCount
      };
      
      store.add(historyItem);
      
      transaction.oncomplete = () => {
        loadQueryHistory(); // Reload history after adding new item
      };
    };
  };

  const executeQuery = async () => {
    if (!connection.url || !query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionUrl: connection.url,
          query: query.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute query');
      }

      setResult({
        columns: data.columns || [],
        rows: data.rows || [],
        rowCount: data.rowCount || 0,
      });
      
      // Save successful query to history
      saveQueryToHistory(query.trim(), true, data.rowCount);
    } catch (err) {
      console.error('Error executing query:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setResult(null);
      
      // Save failed query to history
      saveQueryToHistory(query.trim(), false);
    } finally {
      setLoading(false);
    }
  };

  const loadQueryFromHistory = (historyItem: QueryHistoryItem) => {
    setQuery(historyItem.query);
  };

  const clearQueryHistory = () => {
    if (!confirm('Are you sure you want to clear your query history?')) {
      return;
    }
    
    const request = indexedDB.open('DatabaseViewerDB', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['queryHistory'], 'readwrite');
      const store = transaction.objectStore('queryHistory');
      
      // Only clear history for the current connection
      if (connection.url) {
        const index = store.index('connectionUrl');
        const keyRange = IDBKeyRange.only(connection.url);
        const cursorRequest = index.openCursor(keyRange);
        
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      } else {
        // If no connection, clear all history
        store.clear();
      }
      
      transaction.oncomplete = () => {
        setQueryHistory([]);
      };
    };
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">SQL Query</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <textarea
              className="w-full h-64 p-4 font-mono text-sm focus:outline-none resize-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              spellCheck="false"
            />
          </div>
          
          <div className="flex justify-between items-center">
            <Button 
              onClick={executeQuery} 
              disabled={!connection.url || !query.trim() || loading}
              isLoading={loading}
            >
              Execute Query
            </Button>
            
            <div className="text-sm text-gray-500">
              {connection.url ? `Connected to ${connection.database}` : 'Not connected'}
            </div>
          </div>
        </div>

        {/* Query History */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Query History</h3>
            {queryHistory.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearQueryHistory}
              >
                Clear History
              </Button>
            )}
          </div>
          
          <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
            {queryHistory.length > 0 ? (
              <div className="divide-y">
                {queryHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-3 hover:bg-foreground/5 cursor-pointer ${!item.success ? 'bg-red-50' : ''}`}
                    onClick={() => loadQueryFromHistory(item)}
                  >
                    <div className="font-mono text-sm truncate">{item.query}</div>
                    <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                      <span>{new Date(item.timestamp).toLocaleString()}</span>
                      {item.success ? (
                        <span className="text-green-600">{item.rowCount} rows</span>
                      ) : (
                        <span className="text-red-600">Failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No query history
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Query Results */}
      {(result || error) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Results</h3>
          
          {error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          ) : result && (
            <div>
              <div className="mb-2 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'} returned
                </div>
                
                {result.rowCount > 0 && (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportToCSV(result.columns, result.rows, `query-result-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`)}
                    >
                      Export CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportToJSON(result.rows, `query-result-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`)}
                    >
                      Export JSON
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg overflow-x-auto">
                {result.columns.length > 0 ? (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-foreground/5">
                        {result.columns.map((column, index) => (
                          <th key={index} className="border px-4 py-2 text-left font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-foreground/5">
                          {result.columns.map((column, colIndex) => (
                            <td key={colIndex} className="border px-4 py-2">
                              {row[column] === null
                                ? 'NULL'
                                : typeof row[column] === 'object'
                                ? JSON.stringify(row[column])
                                : String(row[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Query executed successfully. No results to display.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}