'use client';

import { useState, useEffect } from 'react';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

interface ForeignKey {
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface TableInfo {
  structure: TableColumn[];
  primaryKeys: string[];
  foreignKeys: ForeignKey[];
  data: Record<string, any>[];
  totalRows: number;
}

export function TableView() {
  const { connection, currentTable } = useDatabaseStore();
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    if (connection.url && currentTable) {
      fetchTableInfo();
    }
  }, [connection.url, currentTable]);

  const fetchTableInfo = async () => {
    if (!connection.url || !currentTable) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/database/tables/${currentTable}?connectionUrl=${encodeURIComponent(connection.url)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch table information');
      }

      const data = await response.json();
      setTableInfo(data);
    } catch (err) {
      console.error('Error fetching table info:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (newPage: number) => {
    if (!connection.url || !currentTable) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/database/tables/${currentTable}/data?connectionUrl=${encodeURIComponent(
          connection.url
        )}&page=${newPage}&pageSize=${pageSize}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch table data');
      }

      const data = await response.json();
      setTableInfo(prevInfo => {
        if (!prevInfo) return null;
        return {
          ...prevInfo,
          data: data.data,
        };
      });
      setPage(newPage);
    } catch (err) {
      console.error('Error fetching table data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!currentTable) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Select a table from the sidebar</p>
      </div>
    );
  }

  if (loading && !tableInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading table information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchTableInfo}>Retry</Button>
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>No table information available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">{currentTable}</h2>
        <p className="text-sm text-gray-500 mb-4">{tableInfo.totalRows} total rows</p>
      </div>

      {/* Table Structure */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Structure</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-foreground/5">
                <th className="border px-4 py-2 text-left">Column</th>
                <th className="border px-4 py-2 text-left">Type</th>
                <th className="border px-4 py-2 text-left">Nullable</th>
                <th className="border px-4 py-2 text-left">Default</th>
                <th className="border px-4 py-2 text-left">Primary Key</th>
                <th className="border px-4 py-2 text-left">Foreign Key</th>
              </tr>
            </thead>
            <tbody>
              {tableInfo.structure.map((column) => {
                const isPrimaryKey = tableInfo.primaryKeys.includes(column.column_name);
                const foreignKey = tableInfo.foreignKeys.find(
                  (fk) => fk.column_name === column.column_name
                );

                return (
                  <tr key={column.column_name} className="hover:bg-foreground/5">
                    <td className="border px-4 py-2">{column.column_name}</td>
                    <td className="border px-4 py-2">
                      {column.data_type}
                      {column.character_maximum_length
                        ? `(${column.character_maximum_length})`
                        : ''}
                    </td>
                    <td className="border px-4 py-2">
                      {column.is_nullable === 'YES' ? 'Yes' : 'No'}
                    </td>
                    <td className="border px-4 py-2">{column.column_default || '-'}</td>
                    <td className="border px-4 py-2">{isPrimaryKey ? 'Yes' : 'No'}</td>
                    <td className="border px-4 py-2">
                      {foreignKey
                        ? `${foreignKey.foreign_table_name}.${foreignKey.foreign_column_name}`
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Data */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Data</h3>
        <div className="overflow-x-auto">
          {tableInfo.data.length > 0 ? (
            <>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-foreground/5">
                    {Object.keys(tableInfo.data[0]).map((key) => (
                      <th key={key} className="border px-4 py-2 text-left">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableInfo.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-foreground/5">
                      {Object.values(row).map((value, valueIndex) => (
                        <td key={valueIndex} className="border px-4 py-2">
                          {value === null
                            ? 'NULL'
                            : typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => fetchTableData(page - 1)}
                  disabled={page === 1 || loading}
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {Math.ceil(tableInfo.totalRows / pageSize)}
                </span>
                <Button
                  onClick={() => fetchTableData(page + 1)}
                  disabled={page * pageSize >= tableInfo.totalRows || loading}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <p>No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}