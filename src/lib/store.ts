import { create } from 'zustand';
import { PostgresError } from '@vercel/postgres';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SSHConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

interface DatabaseConnection {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  url: string;
  ssh: SSHConfig;
}

interface DatabaseState {
  connection: DatabaseConnection;
  status: ConnectionStatus;
  error: PostgresError | Error | null;
  tables: string[];
  currentTable: string | null;
  currentTab: 'tables' | 'rls' | 'query';
  setConnection: (connection: Partial<DatabaseConnection>) => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: PostgresError | Error | null) => void;
  setTables: (tables: string[]) => void;
  setCurrentTable: (table: string | null) => void;
  setCurrentTab: (tab: 'tables' | 'rls' | 'query') => void;
  resetConnection: () => void;
}

const initialConnection: DatabaseConnection = {
  host: '',
  port: '5432',
  username: '',
  password: '',
  database: '',
  url: '',
  ssh: {
    enabled: false,
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
  },
};

export const useDatabaseStore = create<DatabaseState>((set) => ({
  connection: initialConnection,
  status: 'disconnected',
  error: null,
  tables: [],
  currentTable: null,
  currentTab: 'tables',
  setConnection: (connection) =>
    set((state) => ({
      connection: { ...state.connection, ...connection },
    })),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setTables: (tables) => set({ tables }),
  setCurrentTable: (currentTable) => set({ currentTable }),
  setCurrentTab: (currentTab) => set({ currentTab }),
  resetConnection: () =>
    set({
      connection: initialConnection,
      status: 'disconnected',
      error: null,
      tables: [],
      currentTable: null,
    }),
}));