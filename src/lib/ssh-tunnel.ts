import { Client } from 'ssh2';
// import { Socket } from 'net';

interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

interface ForwardConfig {
  srcHost: string;
  srcPort: number;
  dstHost: string;
  dstPort: number;
}

/**
 * Creates an SSH tunnel for database connections
 * @param sshConfig SSH connection configuration
 * @param forwardConfig Port forwarding configuration
 * @returns Promise that resolves to a function to close the tunnel
 */
export const createSSHTunnel = (
  sshConfig: SSHConfig,
  forwardConfig: ForwardConfig
): Promise<() => void> => {
  return new Promise((resolve, reject) => {
    const ssh = new Client();
    let connected = false;

    ssh.on('ready', () => {
      connected = true;
      
      ssh.forwardOut(
        forwardConfig.srcHost,
        forwardConfig.srcPort,
        forwardConfig.dstHost,
        forwardConfig.dstPort,
        (err, stream) => {
          if (err) {
            ssh.end();
            reject(err);
            return;
          }

          // Return a function to close the tunnel
          resolve(() => {
            if (connected) {
              ssh.end();
              connected = false;
            }
          });
        }
      );
    });

    ssh.on('error', (err) => {
      reject(err);
    });

    ssh.connect(sshConfig);
  });
};

/**
 * Creates a connection string for PostgreSQL that uses an SSH tunnel
 * @param dbConfig Database configuration
 * @param sshConfig SSH configuration
 * @returns Modified connection string that works with the tunnel
 */
export const createTunnelConnectionString = (
  originalConnectionString: string,
  sshConfig: SSHConfig
): string => {
  // Parse the original connection string
  const url = new URL(originalConnectionString);
  
  // Replace the host and port with localhost and a local port
  // This assumes the tunnel is set up to forward from localhost to the remote DB
  url.host = 'localhost:5432';
  
  return url.toString();
};