/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"
import { Client } from 'ssh2';
// import { Socket } from 'net';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  enabled: boolean;
}

export interface DBConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
}

/**
 * Creates an SSH tunnel for database connections
 * @param sshConfig SSH connection configuration
 * @param dbConfig Database configuration
 * @returns Promise that resolves with local port and close function
 */
export const createSSHTunnel = async (
  sshConfig: SSHConfig,
  dbConfig: DBConfig
): Promise<{ localPort: number; /*close: () => void*/ }> => {
  return new Promise((resolve, reject) => {
    if (!sshConfig.enabled) {
      reject(new Error('SSH tunnel is not enabled'));
      return;
    }

    const ssh = new Client();
    let connected = false;

    // Use a random local port
    const localPort = Math.floor(Math.random() * (65535 - 1024) + 1024);

    ssh.on('ready', () => {
      connected = true;
      
      // Forward local port to remote database server
      ssh.forwardOut(
        '127.0.0.1',
        localPort,
        dbConfig.host,
        parseInt(dbConfig.port, 10),
        (err, ) => {
          if (err) {
            ssh.end();
            reject(err);
            return;
          }

          // Return the local port and close function
          resolve({
            localPort,
            // close: () => {
            //   if (connected) {
            //     ssh.end();
            //     connected = false;
            //   }
            // }
          });
        }
      );
    });

    ssh.on('error', (err) => {
      reject(err);
    });

    // Connect to SSH server
    const connectConfig: any = {
      host: sshConfig.host,
      port: sshConfig.port,
      username: sshConfig.username,
    };

    // Add authentication method
    if (sshConfig.privateKey) {
      connectConfig.privateKey = sshConfig.privateKey;
      
      // Add passphrase if provided for encrypted private key
      if (sshConfig.passphrase) {
        connectConfig.passphrase = sshConfig.passphrase;
      }
    } else if (sshConfig.password) {
      connectConfig.password = sshConfig.password;
    }

    ssh.connect(connectConfig);
  });
};

/**
 * Creates a connection string for PostgreSQL that uses an SSH tunnel
 * @param dbConfig Database configuration
 * @param localPort Local port that is forwarded to the remote database
 * @returns Modified connection string that works with the tunnel
 */
export const createTunnelConnectionString = async (
  dbConfig: DBConfig,
  localPort: number
): Promise<string> => {
  return `postgres://${dbConfig.username}:${dbConfig.password}@localhost:5432/${dbConfig.database}`;
};