'use client';

import { useState } from 'react';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

interface DeleteColumnFormProps {
  tableName: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DeleteColumnForm({
  tableName,
  columns,
  onSuccess,
  onCancel,
}: DeleteColumnFormProps) {
  const { connection } = useDatabaseStore();
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedColumn) {
      setError('Please select a column to delete');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/database/tables/structure`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionUrl: connection.url,
          tableName,
          columnName: selectedColumn,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete column');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error deleting column:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Delete Column</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="column" className="block text-sm font-medium mb-1">
            Select Column to Delete
          </label>
          <select
            id="column"
            className="w-full p-2 border rounded-md"
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            required
          >
            <option value="">Select a column...</option>
            {columns.map((column) => (
              <option key={column.column_name} value={column.column_name}>
                {column.column_name} ({column.data_type})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-yellow-800 text-sm">
          <p className="font-medium">Warning:</p>
          <p>Deleting a column will permanently remove all data in that column. This action cannot be undone.</p>
        </div>

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            isLoading={isSubmitting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Column
          </Button>
        </div>
      </form>
    </div>
  );
}