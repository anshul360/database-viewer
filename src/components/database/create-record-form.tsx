'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

interface CreateRecordFormProps {
  tableName: string;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateRecordForm({
  tableName,
  columns,
  onSuccess,
  onCancel,
}: CreateRecordFormProps) {
  const { connection } = useDatabaseStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create default values based on columns
  const defaultValues = columns.reduce((acc, column) => {
    // Skip serial/identity columns as they are auto-generated
    if (column.column_default && 
        (column.column_default.includes('nextval') || 
         column.column_default.includes('identity'))) {
      return acc;
    }
    
    acc[column.column_name] = null;
    return acc;
  }, {} as Record<string, any>);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues,
  });

  const onSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Filter out null values for columns that have defaults or are auto-generated
      const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
        const column = columns.find(col => col.column_name === key);
        
        // Skip if the column has a default value and the input is null/empty
        if (column?.column_default && (value === null || value === '')) {
          return acc;
        }
        
        acc[key] = value;
        return acc;
      }, {} as Record<string, any>);

      // Make API request to create the record
      const response = await fetch(`/api/database/tables/${tableName}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionUrl: connection.url,
          data: filteredData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create record');
      }

      // Reset form
      reset();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating record:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Create New Record</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
            {error}
          </div>
        )}

        {columns.map((column) => {
          // Skip serial/identity columns as they are auto-generated
          if (column.column_default && 
              (column.column_default.includes('nextval') || 
               column.column_default.includes('identity'))) {
            return null;
          }
          
          const isNullable = column.is_nullable === 'YES';
          const isRequired = !isNullable && !column.column_default;
          
          return (
            <div key={column.column_name}>
              <label htmlFor={column.column_name} className="block text-sm font-medium mb-1">
                {column.column_name} {isRequired && <span className="text-red-500">*</span>}
              </label>
              
              {column.data_type === 'boolean' ? (
                <select
                  id={column.column_name}
                  className="w-full p-2 border rounded-md"
                  {...register(column.column_name, { required: isRequired })}
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
                  {...register(column.column_name, { required: isRequired })}
                />
              ) : column.data_type.includes('json') ? (
                <textarea
                  id={column.column_name}
                  className="w-full p-2 border rounded-md font-mono"
                  rows={5}
                  placeholder="{}"
                  {...register(column.column_name, { required: isRequired })}
                />
              ) : column.data_type.includes('date') || column.data_type.includes('time') ? (
                <input
                  id={column.column_name}
                  type="datetime-local"
                  className="w-full p-2 border rounded-md"
                  {...register(column.column_name, { required: isRequired })}
                />
              ) : (
                <input
                  id={column.column_name}
                  type={column.data_type.includes('int') ? 'number' : 'text'}
                  className="w-full p-2 border rounded-md"
                  {...register(column.column_name, { required: isRequired })}
                />
              )}
              
              {errors[column.column_name] && (
                <p className="mt-1 text-sm text-red-600">This field is required</p>
              )}
              
              {column.column_default && (
                <p className="mt-1 text-xs text-gray-500">
                  Default: {column.column_default}
                </p>
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
            Create Record
          </Button>
        </div>
      </form>
    </div>
  );
}