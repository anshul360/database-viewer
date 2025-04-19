'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

const columnSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  type: z.string().min(1, 'Data type is required'),
  primaryKey: z.boolean().default(false),
  unique: z.boolean().default(false),
  notNull: z.boolean().default(false),
  default: z.string().optional(),
  references: z.object({
    table: z.string().optional(),
    column: z.string().optional(),
    onDelete: z.string().optional(),
    onUpdate: z.string().optional(),
  }).optional(),
});

const tableSchema = z.object({
  tableName: z.string().min(1, 'Table name is required'),
  columns: z.array(columnSchema).min(1, 'At least one column is required'),
});

type TableFormValues = z.infer<typeof tableSchema>;

export function CreateTableForm({ onSuccess }: { onSuccess?: () => void }) {
  const { connection, setTables, tables } = useDatabaseStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TableFormValues>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      tableName: '',
      columns: [{ name: '', type: 'TEXT', primaryKey: false, unique: false, notNull: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'columns',
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

  const onSubmit = async (data: TableFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Format columns for API request
      const formattedColumns = data.columns.map(column => {
        const formatted: any = {
          name: column.name,
          type: column.type,
          primaryKey: column.primaryKey,
          unique: column.unique,
          notNull: column.notNull,
        };

        if (column.default && column.default.trim() !== '') {
          formatted.default = column.default;
        }

        if (column.references && column.references.table && column.references.column) {
          formatted.references = {
            table: column.references.table,
            column: column.references.column,
          };

          if (column.references.onDelete) {
            formatted.references.onDelete = column.references.onDelete;
          }

          if (column.references.onUpdate) {
            formatted.references.onUpdate = column.references.onUpdate;
          }
        }

        return formatted;
      });

      // Make API request to create table
      const response = await fetch('/api/database/tables/structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionUrl: connection.url,
          tableName: data.tableName,
          columns: formattedColumns,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create table');
      }

      // Update tables list
      setTables([...tables, data.tableName]);

      // Reset form
      reset();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating table:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Create New Table</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="tableName" className="block text-sm font-medium mb-1">
            Table Name
          </label>
          <input
            id="tableName"
            type="text"
            className="w-full p-2 border rounded-md"
            {...register('tableName')}
          />
          {errors.tableName && (
            <p className="mt-1 text-sm text-red-600">{errors.tableName.message}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-medium">Columns</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', type: 'TEXT', primaryKey: false, unique: false, notNull: false })}
            >
              Add Column
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-md mb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium">Column {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-md"
                    {...register(`columns.${index}.name` as const)}
                  />
                  {errors.columns?.[index]?.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.columns[index]?.name?.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data Type
                  </label>
                  <select
                    className="w-full p-2 border rounded-md"
                    {...register(`columns.${index}.type` as const)}
                  >
                    {dataTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {errors.columns?.[index]?.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.columns[index]?.type?.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`primaryKey-${index}`}
                    className="mr-2"
                    {...register(`columns.${index}.primaryKey` as const)}
                  />
                  <label htmlFor={`primaryKey-${index}`} className="text-sm">
                    Primary Key
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`unique-${index}`}
                    className="mr-2"
                    {...register(`columns.${index}.unique` as const)}
                  />
                  <label htmlFor={`unique-${index}`} className="text-sm">
                    Unique
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`notNull-${index}`}
                    className="mr-2"
                    {...register(`columns.${index}.notNull` as const)}
                  />
                  <label htmlFor={`notNull-${index}`} className="text-sm">
                    Not Null
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Default Value (optional)
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md"
                  {...register(`columns.${index}.default` as const)}
                />
              </div>

              <div className="border-t pt-3 mt-3">
                <h5 className="text-sm font-medium mb-2">Foreign Key Reference (optional)</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Referenced Table</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      {...register(`columns.${index}.references.table` as const)}
                    >
                      <option value="">None</option>
                      {tables.map((table) => (
                        <option key={table} value={table}>
                          {table}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Referenced Column</label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-md"
                      placeholder="column_name"
                      {...register(`columns.${index}.references.column` as const)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {errors.columns && !Array.isArray(errors.columns) && (
            <p className="mt-1 text-sm text-red-600">{errors.columns.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSubmitting}>
            Create Table
          </Button>
        </div>
      </form>
    </div>
  );
}