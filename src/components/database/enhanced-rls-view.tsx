'use client';

import { useState, useEffect } from 'react';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { CreatePolicyForm } from '@/components/database/create-policy-form';

interface RLSPolicy {
  schema_name: string;
  table_name: string;
  policy_name: string;
  policy_type: string;
  command: string;
  using_expression: string | null;
  with_check_expression: string | null;
  roles: string[];
}

interface TableRLSStatus {
  schema_name: string;
  table_name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
}

export function EnhancedRLSView() {
  const { connection, tables } = useDatabaseStore();
  const [policies, setPolicies] = useState<RLSPolicy[]>([]);
  const [tablesWithRls, setTablesWithRls] = useState<TableRLSStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  // Modal states
  const [isCreatePolicyModalOpen, setIsCreatePolicyModalOpen] = useState(false);
  const [tableForNewPolicy, setTableForNewPolicy] = useState<string | null>(null);

  useEffect(() => {
    if (connection.url) {
      fetchRLSPolicies();
    }
  }, [connection.url]);

  const fetchRLSPolicies = async () => {
    if (!connection.url) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/database/rls?connectionUrl=${encodeURIComponent(connection.url)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch RLS policies');
      }

      const data = await response.json();
      setPolicies(data.policies);
      setTablesWithRls(data.tablesWithRls);
    } catch (err) {
      console.error('Error fetching RLS policies:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName === selectedTable ? null : tableName);
  };

  const handleCreatePolicy = (tableName: string) => {
    setTableForNewPolicy(tableName);
    setIsCreatePolicyModalOpen(true);
  };

  const handleCreatePolicySuccess = () => {
    setIsCreatePolicyModalOpen(false);
    setTableForNewPolicy(null);
    fetchRLSPolicies();
  };

  const handleToggleRLS = async (tableName: string, enable: boolean) => {
    if (!connection.url) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/database/tables/structure', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionUrl: connection.url,
          tableName,
          operation: enable ? 'enable_rls' : 'disable_rls',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${enable ? 'enable' : 'disable'} RLS`);
      }

      // Refresh RLS policies
      fetchRLSPolicies();
    } catch (err) {
      console.error(`Error ${enable ? 'enabling' : 'disabling'} RLS:`, err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePolicy = async (policyName: string, tableName: string) => {
    if (!connection.url) return;

    if (!confirm(`Are you sure you want to delete the policy "${policyName}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/database/rls?connectionUrl=${encodeURIComponent(connection.url)}&tableName=${encodeURIComponent(tableName)}&policyName=${encodeURIComponent(policyName)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete policy');
      }

      // Refresh RLS policies
      fetchRLSPolicies();
    } catch (err) {
      console.error('Error deleting policy:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTablePolicies = (tableName: string) => {
    return policies.filter(policy => policy.table_name === tableName);
  };

  const isRLSEnabled = (tableName: string) => {
    const table = tablesWithRls.find(t => t.table_name === tableName);
    return table?.rls_enabled || false;
  };

  const isRLSForced = (tableName: string) => {
    const table = tablesWithRls.find(t => t.table_name === tableName);
    return table?.rls_forced || false;
  };

  if (loading && policies.length === 0 && tablesWithRls.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading RLS information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchRLSPolicies}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Row Level Security</h2>
        <p className="text-sm text-gray-500 mb-4">
          Manage row-level security policies for your tables
        </p>
      </div>

      {/* Tables with RLS Status */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Tables</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-foreground/5">
                <th className="border px-4 py-2 text-left">Table</th>
                <th className="border px-4 py-2 text-left">RLS Enabled</th>
                <th className="border px-4 py-2 text-left">RLS Forced</th>
                <th className="border px-4 py-2 text-left">Policies</th>
                <th className="border px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((tableName) => {
                const tablePolicies = getTablePolicies(tableName);
                const rlsEnabled = isRLSEnabled(tableName);
                const rlsForced = isRLSForced(tableName);

                return (
                  <tr key={tableName} className="hover:bg-foreground/5">
                    <td className="border px-4 py-2">{tableName}</td>
                    <td className="border px-4 py-2">
                      {rlsEnabled ? 'Yes' : 'No'}
                    </td>
                    <td className="border px-4 py-2">
                      {rlsForced ? 'Yes' : 'No'}
                    </td>
                    <td className="border px-4 py-2">{tablePolicies.length}</td>
                    <td className="border px-4 py-2">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTableSelect(tableName)}
                        >
                          {selectedTable === tableName ? 'Hide Policies' : 'Show Policies'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRLS(tableName, !rlsEnabled)}
                        >
                          {rlsEnabled ? 'Disable RLS' : 'Enable RLS'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreatePolicy(tableName)}
                          disabled={!rlsEnabled}
                        >
                          Add Policy
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Table Policies */}
      {selectedTable && (
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Policies for {selectedTable}
          </h3>
          <div className="overflow-x-auto">
            {getTablePolicies(selectedTable).length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-foreground/5">
                    <th className="border px-4 py-2 text-left">Policy Name</th>
                    <th className="border px-4 py-2 text-left">Type</th>
                    <th className="border px-4 py-2 text-left">Command</th>
                    <th className="border px-4 py-2 text-left">Using Expression</th>
                    <th className="border px-4 py-2 text-left">With Check Expression</th>
                    <th className="border px-4 py-2 text-left">Roles</th>
                    <th className="border px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getTablePolicies(selectedTable).map((policy) => (
                    <tr key={policy.policy_name} className="hover:bg-foreground/5">
                      <td className="border px-4 py-2">{policy.policy_name}</td>
                      <td className="border px-4 py-2">{policy.policy_type}</td>
                      <td className="border px-4 py-2">{policy.command}</td>
                      <td className="border px-4 py-2">{policy.using_expression || '-'}</td>
                      <td className="border px-4 py-2">{policy.with_check_expression || '-'}</td>
                      <td className="border px-4 py-2">{policy.roles.join(', ') || 'PUBLIC'}</td>
                      <td className="border px-4 py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeletePolicy(policy.policy_name, selectedTable)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <p className="mb-4">No policies defined for this table</p>
                {isRLSEnabled(selectedTable) && (
                  <Button onClick={() => handleCreatePolicy(selectedTable)}>
                    Create First Policy
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Policy Modal */}
      {tableForNewPolicy && (
        <Modal
          isOpen={isCreatePolicyModalOpen}
          onClose={() => {
            setIsCreatePolicyModalOpen(false);
            setTableForNewPolicy(null);
          }}
          title={`Create RLS Policy for ${tableForNewPolicy}`}
          maxWidth="max-w-3xl"
        >
          <CreatePolicyForm
            tableName={tableForNewPolicy}
            onSuccess={handleCreatePolicySuccess}
            onCancel={() => {
              setIsCreatePolicyModalOpen(false);
              setTableForNewPolicy(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}