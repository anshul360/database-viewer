'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

const policySchema = z.object({
  policyName: z.string().min(1, 'Policy name is required'),
  command: z.string().optional(),
  using: z.string().optional(),
  withCheck: z.string().optional(),
  roles: z.string().optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface CreatePolicyFormProps {
  tableName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreatePolicyForm({ tableName, onSuccess, onCancel }: CreatePolicyFormProps) {
  const { connection } = useDatabaseStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      policyName: '',
      command: 'ALL',
      using: '',
      withCheck: '',
      roles: '',
    },
  });

  const commands = ['ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'];

  const onSubmit = async (data: PolicyFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Parse roles string into array
      const rolesArray = data.roles
        ? data.roles.split(',').map(role => role.trim()).filter(Boolean)
        : [];

      // Make API request to create policy
      const response = await fetch('/api/database/rls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionUrl: connection.url,
          tableName,
          policyName: data.policyName,
          command: data.command,
          using: data.using || null,
          withCheck: data.withCheck || null,
          roles: rolesArray,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create policy');
      }

      // Reset form
      reset();

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating policy:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Create RLS Policy for {tableName}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="policyName" className="block text-sm font-medium mb-1">
            Policy Name
          </label>
          <input
            id="policyName"
            type="text"
            className="w-full p-2 border rounded-md"
            {...register('policyName')}
          />
          {errors.policyName && (
            <p className="mt-1 text-sm text-red-600">{errors.policyName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="command" className="block text-sm font-medium mb-1">
            Command
          </label>
          <select
            id="command"
            className="w-full p-2 border rounded-md"
            {...register('command')}
          >
            {commands.map((cmd) => (
              <option key={cmd} value={cmd}>
                {cmd}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="using" className="block text-sm font-medium mb-1">
            USING Expression (for SELECT, UPDATE, DELETE)
          </label>
          <textarea
            id="using"
            className="w-full p-2 border rounded-md font-mono"
            rows={3}
            placeholder="e.g., user_id = current_user"
            {...register('using')}
          />
          <p className="mt-1 text-xs text-gray-500">
            SQL expression that returns a boolean. Rows for which this expression returns true will be visible in SELECT queries and available for UPDATE and DELETE operations.
          </p>
        </div>

        <div>
          <label htmlFor="withCheck" className="block text-sm font-medium mb-1">
            WITH CHECK Expression (for INSERT, UPDATE)
          </label>
          <textarea
            id="withCheck"
            className="w-full p-2 border rounded-md font-mono"
            rows={3}
            placeholder="e.g., user_id = current_user"
            {...register('withCheck')}
          />
          <p className="mt-1 text-xs text-gray-500">
            SQL expression that returns a boolean. Rows for which this expression returns true will be allowed in INSERT and UPDATE operations.
          </p>
        </div>

        <div>
          <label htmlFor="roles" className="block text-sm font-medium mb-1">
            Roles (comma-separated, leave empty for PUBLIC)
          </label>
          <input
            id="roles"
            type="text"
            className="w-full p-2 border rounded-md"
            placeholder="e.g., admin, editor"
            {...register('roles')}
          />
          <p className="mt-1 text-xs text-gray-500">
            Database roles to which this policy applies. Leave empty to apply to all roles (PUBLIC).
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isSubmitting}>
            Create Policy
          </Button>
        </div>
      </form>
    </div>
  );
}