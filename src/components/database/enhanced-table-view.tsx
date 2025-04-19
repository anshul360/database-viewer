'use client';

import { useState, useEffect } from 'react';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { CreateTableForm } from '@/components/database/create-table-form';
import { CreateRecordForm } from '@/components/database/create-record-form';
import { EditRecordForm } from '@/components/database/edit-record-form';
import { AddColumnForm } from '@/components/database/add-column-form';
import { DeleteColumnForm } from '@/components/database/delete-column-form';

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

export function EnhancedTableView() {
  const { connection, currentTable, tables } = useDatabaseStore();
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Modal states
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [isCreateRecordModalOpen, setIsCreateRecordModalOpen] = useState(false);
  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isDeleteColumnModalOpen, setIsDeleteColumnModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);

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

  const handleDeleteRecord = async (record: Record<string, any>) => {
    if (!connection.url || !currentTable || !tableInfo) return;

    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Construct the WHERE clause for the primary key(s)
      const whereConditions = tableInfo.primaryKeys.map(key => {
        const value = record[key];
        if (value === null) {
          return `"${key}" IS NULL`;
        }
        return typeof value === 'string'
          ? `"${key}" = '${value.replace(/'/g, "''")}'`
          : `"${key}" = ${value}`;
      }).join(' AND ');

      // Make API request to delete the record
      const response = await fetch(`/api/database/tables/${currentTable}/data`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionUrl: connection.url,
          where: whereConditions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete record');
      }

      // Refresh table data
      fetchTableData(page);
    } catch (err) {
      console.error('Error deleting record:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = (record: Record<string, any>) => {
    setSelectedRecord(record);
    setIsEditRecordModalOpen(true);
  };

  const handleCreateTableSuccess = () => {
    setIsCreateTableModalOpen(false);
    // The tables list is updated in the form component
  };

  const handleCreateRecordSuccess = () => {
    setIsCreateRecordModalOpen(false);
    fetchTableData(page);
  };

  const handleEditRecordSuccess = () => {
    setIsEditRecordModalOpen(false);
    setSelectedRecord(null);
    fetchTableData(page);
  };

  const handleAddColumnSuccess = () => {
    setIsAddColumnModalOpen(false);
    fetchTableInfo();
  };

  const handleDeleteColumnSuccess = () => {
    setIsDeleteColumnModalOpen(false);
    fetchTableInfo();
  };

  if (!currentTable && tables.length > 0) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Tables</h2>
          <Button onClick={() => setIsCreateTableModalOpen(true)}>
            Create New Table
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div 
              key={table} 
              className="p-4 border rounded-lg hover:bg-foreground/5 cursor-pointer"
              onClick={() => useDatabaseStore.getState().setCurrentTable(table)}
            >
              <h3 className="font-medium">{table}</h3>
            </div>
          ))}
        </div>

        {/* Create Table Modal */}
        <Modal
          isOpen={isCreateTableModalOpen}
          onClose={() => setIsCreateTableModalOpen(false)}
          title="Create New Table"
          maxWidth="max-w-4xl"
        >
          <CreateTableForm onSuccess={handleCreateTableSuccess} />
        </Modal>
      </div>
    );
  }

  if (!currentTable) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No tables found in the database</p>
          <Button onClick={() => setIsCreateTableModalOpen(true)}>
            Create New Table
          </Button>

          {/* Create Table Modal */}
          <Modal
            isOpen={isCreateTableModalOpen}
            onClose={() => setIsCreateTableModalOpen(false)}
            title="Create New Table"
            maxWidth="max-w-4xl"
          >
            <CreateTableForm onSuccess={handleCreateTableSuccess} />
          </Modal>
        </div>
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{currentTable}</h2>
          <p className="text-sm text-gray-500">{tableInfo.totalRows} total rows</p>
        </div>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setIsCreateTableModalOpen(true)}
          >
            Create New Table
          </Button>
          <Button onClick={() => setIsCreateRecordModalOpen(true)}>
            Add Record
          </Button>
        </div>
      </div>

      {/* Table Structure */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Structure</h3>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsAddColumnModalOpen(true)}
            >
              Add Column
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsDeleteColumnModalOpen(true)}
              className="text-red-500 hover:text-red-700"
            >
              Delete Column
            </Button>
          </div>
        </div>
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
                    <th className="border px-4 py-2 text-left">Actions</th>
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
                      <td className="border px-4 py-2">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRecord(row)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteRecord(row)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
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
            <div className="text-center py-8">
              <p className="mb-4">No data available</p>
              <Button onClick={() => setIsCreateRecordModalOpen(true)}>
                Add First Record
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Table Modal */}
      <Modal
        isOpen={isCreateTableModalOpen}
        onClose={() => setIsCreateTableModalOpen(false)}
        title="Create New Table"
        maxWidth="max-w-4xl"
      >
        <CreateTableForm onSuccess={handleCreateTableSuccess} />
      </Modal>

      {/* Create Record Modal */}
      <Modal
        isOpen={isCreateRecordModalOpen}
        onClose={() => setIsCreateRecordModalOpen(false)}
        title={`Add Record to ${currentTable}`}
        maxWidth="max-w-3xl"
      >
        <CreateRecordForm
          tableName={currentTable}
          columns={tableInfo.structure}
          onSuccess={handleCreateRecordSuccess}
          onCancel={() => setIsCreateRecordModalOpen(false)}
        />
      </Modal>

      {/* Edit Record Modal */}
      {selectedRecord && (
        <Modal
          isOpen={isEditRecordModalOpen}
          onClose={() => {
            setIsEditRecordModalOpen(false);
            setSelectedRecord(null);
          }}
          title={`Edit Record in ${currentTable}`}
          maxWidth="max-w-3xl"
        >
          <EditRecordForm
            tableName={currentTable}
            record={selectedRecord}
            columns={tableInfo.structure}
            primaryKeys={tableInfo.primaryKeys}
            onSuccess={handleEditRecordSuccess}
            onCancel={() => {
              setIsEditRecordModalOpen(false);
              setSelectedRecord(null);
            }}
          />
        </Modal>
      )}

      {/* Add Column Modal */}
      <Modal
        isOpen={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        title={`Add Column to ${currentTable}`}
        maxWidth="max-w-2xl"
      >
        <AddColumnForm
          tableName={currentTable}
          onSuccess={handleAddColumnSuccess}
          onCancel={() => setIsAddColumnModalOpen(false)}
        />
      </Modal>

      {/* Delete Column Modal */}
      <Modal
        isOpen={isDeleteColumnModalOpen}
        onClose={() => setIsDeleteColumnModalOpen(false)}
        title={`Delete Column from ${currentTable}`}
        maxWidth="max-w-2xl"
      >
        <DeleteColumnForm
          tableName={currentTable}
          columns={tableInfo?.structure || []}
          onSuccess={handleDeleteColumnSuccess}
          onCancel={() => setIsDeleteColumnModalOpen(false)}
        />
      </Modal>
    </div>
  );
}