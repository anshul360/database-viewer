'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

const columnSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  type: z.string().min(1, 'Data type is required'),
  notNull: z.boolean().default(false),
  default: z.string().optional(),
});

type ColumnFormValues = z.infer<typeof columnSchema>;

interface AddColumnFormProps {
  tableName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddColumnForm({
  tableName,
  onSuccess,
  onCancel,
}: AddColumnFormProps) {
  const { connection } = useDatabaseStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ColumnFormValues>({
    resolver: zodResolver(columnSchema),
    defaultValues: {
      name: '',
      type: 'TEXT',
      notNull: false,
      default: '',
    },
  });

  const dataTypes = [
    'TEXT',
    'VARCHAR',
    'CHAR',
    'INTEGER',
    'BIGINT',
    'SMALLINT',
    'DECIMAL',
    'NUMERIC',
    'REAL',
    'DOUBLE PRECISION',
    'BOOLEAN',
    'DATE',
    'TIME',
    'TIMESTAMP',
    'TIMESTAMPTZ',
    'JSON',
    'JSONB',
    'UUID',
  ];

  const onSubmit = async (data: ColumnFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Format column for API request
      const column = {
        name: data.name,
        type: data.type,
        notNull: data.notNull,
        default: data.default && data.default.trim() !== '' ? data.default : undefined,
      };

      // Make API request to add column
      const response = await fetch('/api/database/tables/structure', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionUrl: connection.url,
          tableName,
          operation: 'addColumn',
          column,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add column');
      }

      // Reset form
      reset();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error adding column:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Add Column to {tableName}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Column Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            className="w-full p-2 border rounded-md"
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-1">
            Data Type <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            className="w-full p-2 border rounded-md"
            {...register('type')}
          >
            {dataTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="notNull"
            type="checkbox"
            className="h-4 w-4"
            {...register('notNull')}
          />
          <label htmlFor="notNull" className="text-sm font-medium">
            Not Null
          </label>
        </div>

        <div>
          <label htmlFor="default" className="block text-sm font-medium mb-1">
            Default Value
          </label>
          <input
            id="default"
            type="text"
            className="w-full p-2 border rounded-md"
            placeholder="Leave empty for no default"
            {...register('default')}
          />
          <p className="mt-1 text-xs text-gray-500">
            For text values, wrap in single quotes (e.g., 'default text')
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Column'}
          </Button>
        </div>
      </form>
    </div>
  );
}