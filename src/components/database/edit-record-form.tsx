'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

interface EditRecordFormProps {
  tableName: string;
  record: Record<string, any>;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>;
  primaryKeys: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditRecordForm({
  tableName,
  record,
  columns,
  primaryKeys,
  onSuccess,
  onCancel,
}: EditRecordFormProps) {
  const { connection } = useDatabaseStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: record,
  });

  useEffect(() => {
    reset(record);
  }, [record, reset]);

  const onSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Construct the WHERE clause for the primary key(s)
      const whereConditions = primaryKeys.map(key => {
        const value = record[key];
        if (value === null) {
          return `"${key}" IS NULL`;
        }
        return typeof value === 'string'
          ? `"${key}" = '${value.replace(/'/g, "''")}'`
          : `"${key}" = ${value}`;
      }).join(' AND ');

      // Make API request to update the record
      const response = await fetch(`/api/database/tables/${tableName}/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionUrl: connection.url,
          data,
          where: whereConditions,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update record');
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error updating record:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Edit Record</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
            {error}
          </div>
        )}

        {columns.map((column) => {
          const isPrimaryKey = primaryKeys.includes(column.column_name);
          const isNullable = column.is_nullable === 'YES';
          
          return (
            <div key={column.column_name}>
              <label htmlFor={column.column_name} className="block text-sm font-medium mb-1">
                {column.column_name} {isPrimaryKey && '(Primary Key)'}
              </label>
              
              {column.data_type === 'boolean' ? (
                <select
                  id={column.column_name}
                  className="w-full p-2 border rounded-md"
                  {...register(column.column_name)}
                  disabled={isPrimaryKey}
                >
                  <option value="true">True</option>
                  <option value="false">False</option>
                  {isNullable && <option value="">NULL</option>}
                </select>
              ) : column.data_type.includes('text') || column.data_type.includes('char') ? (
                <textarea
                  id={column.column_name}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  {...register(column.column_name)}
                  disabled={isPrimaryKey}
                />
              ) : column.data_type.includes('json') ? (
                <textarea
                  id={column.column_name}
                  className="w-full p-2 border rounded-md font-mono"
                  rows={5}
                  {...register(column.column_name)}
                  disabled={isPrimaryKey}
                />
              ) : column.data_type.includes('date') || column.data_type.includes('time') ? (
                <input
                  id={column.column_name}
                  type="datetime-local"
                  className="w-full p-2 border rounded-md"
                  {...register(column.column_name)}
                  disabled={isPrimaryKey}
                />
              ) : (
                <input
                  id={column.column_name}
                  type={column.data_type.includes('int') ? 'number' : 'text'}
                  className="w-full p-2 border rounded-md"
                  {...register(column.column_name)}
                  disabled={isPrimaryKey}
                />
              )}
              
              {errors[column.column_name] && (
                <p className="mt-1 text-sm text-red-600">{errors[column.column_name]?.message}</p>
              )}
            </div>
          );
        })}

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}