'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDatabaseStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { createSSHTunnel, createTunnelConnectionString } from '@/lib/ssh-utils';

const connectionSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.string().default('5432'),
  username: z.string().min(1, 'Username is required'),
  password: z.string(),
  database: z.string().min(1, 'Database name is required'),
  ssh: z.object({
    enabled: z.boolean().default(false),
    host: z.string().optional(),
    port: z.number().default(22),
    username: z.string().optional(),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    passphrase: z.string().optional(),
  }).default({
    enabled: false,
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
    passphrase: '',
  }),
});

type ConnectionFormValues = z.infer<typeof connectionSchema>;

export function ConnectionForm() {
  const { connection, setConnection, setStatus, setError, setTables, resetConnection } = useDatabaseStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      database: connection.database,
      ssh: connection.ssh,
    },
  });

  const onSubmit = async (data: ConnectionFormValues) => {
    setIsConnecting(true);
    setStatus('connecting');
    
    try {
      let url = `postgres://${data.username}:${data.password}@${data.host}:${data.port}/${data.database}`;
      // let tunnelClose: (() => void) | null = null;
      
      // If SSH tunnel is enabled, create it
      if (data.ssh.enabled) {
        try {
          // Create SSH tunnel
          const tunnel = await createSSHTunnel(
            data.ssh,
            {
              host: data.host,
              port: data.port,
              username: data.username,
              password: data.password,
              database: data.database
            }
          );
          
          // Update URL to use the tunnel
          url = await createTunnelConnectionString(
            {
              host: data.host,
              port: data.port,
              username: data.username,
              password: data.password,
              database: data.database
            },
            tunnel.localPort
          );
          
          // tunnelClose = tunnel.close;
        } catch (sshError) {
          console.error('SSH tunnel error:', sshError);
          throw new Error(`SSH tunnel error: ${sshError instanceof Error ? sshError.message : 'Unknown error'}`);
        }
      }
      
      // Update the connection in the store
      setConnection({
        ...data,
        url,
      });
      
      // Make a request to test the connection
      const response = await fetch('/api/database/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Close tunnel if connection failed
        // if (tunnelClose) tunnelClose();
        throw new Error(result.error || 'Failed to connect to database');
      }

      setTables(result.tables);
      setStatus('connected');
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('error');
      setError(error instanceof Error ? error : new Error('Unknown error occurred'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    resetConnection();
    reset();
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Database Connection</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="host" className="block text-sm font-medium mb-1">
              Host
            </label>
            <input
              id="host"
              type="text"
              className="w-full p-2 border rounded-md"
              placeholder="localhost"
              {...register('host')}
            />
            {errors.host && (
              <p className="text-red-500 text-sm mt-1">{errors.host.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="port" className="block text-sm font-medium mb-1">
              Port
            </label>
            <input
              id="port"
              type="text"
              className="w-full p-2 border rounded-md"
              placeholder="5432"
              {...register('port')}
            />
            {errors.port && (
              <p className="text-red-500 text-sm mt-1">{errors.port.message}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="w-full p-2 border rounded-md"
            placeholder="postgres"
            {...register('username')}
          />
          {errors.username && (
            <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full p-2 border rounded-md"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="database" className="block text-sm font-medium mb-1">
            Database
          </label>
          <input
            id="database"
            type="text"
            className="w-full p-2 border rounded-md"
            {...register('database')}
          />
          {errors.database && (
            <p className="text-red-500 text-sm mt-1">{errors.database.message}</p>
          )}
        </div>
        
        {/* SSH Tunnel Configuration */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center mb-4">
            <input
              id="ssh-enabled"
              type="checkbox"
              className="mr-2"
              {...register('ssh.enabled')}
            />
            <label htmlFor="ssh-enabled" className="font-medium">
              Connect via SSH Tunnel
            </label>
          </div>
          
          {watch('ssh.enabled') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ssh-host" className="block text-sm font-medium mb-1">
                    SSH Host
                  </label>
                  <input
                    id="ssh-host"
                    type="text"
                    className="w-full p-2 border rounded-md"
                    placeholder="ssh.example.com"
                    {...register('ssh.host')}
                  />
                </div>
                
                <div>
                  <label htmlFor="ssh-port" className="block text-sm font-medium mb-1">
                    SSH Port
                  </label>
                  <input
                    id="ssh-port"
                    type="number"
                    className="w-full p-2 border rounded-md"
                    placeholder="22"
                    {...register('ssh.port', { valueAsNumber: true })}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="ssh-username" className="block text-sm font-medium mb-1">
                  SSH Username
                </label>
                <input
                  id="ssh-username"
                  type="text"
                  className="w-full p-2 border rounded-md"
                  {...register('ssh.username')}
                />
              </div>
              
              <div>
                <label htmlFor="ssh-password" className="block text-sm font-medium mb-1">
                  SSH Password
                </label>
                <input
                  id="ssh-password"
                  type="password"
                  className="w-full p-2 border rounded-md"
                  {...register('ssh.password')}
                />
              </div>
              
              <div>
                <label htmlFor="ssh-private-key" className="block text-sm font-medium mb-1">
                  SSH Private Key (optional)
                </label>
                <textarea
                  id="ssh-private-key"
                  className="w-full p-2 border rounded-md h-24 font-mono text-sm"
                  placeholder="-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----"
                  {...register('ssh.privateKey')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste your private key here. Password authentication will be used if left empty.
                </p>
              </div>
              
              {watch('ssh.privateKey') && (
                <div>
                  <label htmlFor="ssh-passphrase" className="block text-sm font-medium mb-1">
                    Private Key Passphrase (if encrypted)
                  </label>
                  <input
                    id="ssh-passphrase"
                    type="password"
                    className="w-full p-2 border rounded-md"
                    placeholder="Leave empty if key is not encrypted"
                    {...register('ssh.passphrase')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the passphrase for your encrypted private key.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleDisconnect}
          >
            Disconnect
          </Button>
          <Button 
            type="submit" 
            isLoading={isConnecting}
          >
            Connect
          </Button>
        </div>
      </form>
    </div>
  );
}