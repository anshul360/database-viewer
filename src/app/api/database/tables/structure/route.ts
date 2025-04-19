/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new table
export async function POST(request: NextRequest) {
  try {
    const { connectionUrl, tableName, columns } = await request.json();
    
    if (!connectionUrl || !tableName || !columns || columns.length === 0) {
      return NextResponse.json(
        { error: 'Connection URL, table name, and columns are required' },
        { status: 400 }
      );
    }

    // Create a new connection pool
    const pool = new Pool({
      connectionString: connectionUrl,
      connectionTimeoutMillis: 5000,
    });

    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Construct column definitions
      const columnDefinitions = columns.map((column: any) => {
        let definition = `"${column.name}" ${column.type}`;
        
        if (column.primaryKey) {
          definition += ' PRIMARY KEY';
        }
        
        if (column.unique) {
          definition += ' UNIQUE';
        }
        
        if (column.notNull) {
          definition += ' NOT NULL';
        }
        
        if (column.default !== undefined && column.default !== null) {
          definition += ` DEFAULT ${column.default}`;
        }
        
        if (column.references) {
          definition += ` REFERENCES "${column.references.table}"("${column.references.column}")`;
          
          if (column.references.onDelete) {
            definition += ` ON DELETE ${column.references.onDelete}`;
          }
          
          if (column.references.onUpdate) {
            definition += ` ON UPDATE ${column.references.onUpdate}`;
          }
        }
        
        return definition;
      }).join(', ');
      
      // Construct the CREATE TABLE query
      const query = `
        CREATE TABLE "${tableName}" (
          ${columnDefinitions}
        );
      `;
      
      // Execute the query
      await client.query(query);
      
      return NextResponse.json({
        success: true,
        message: `Table ${tableName} created successfully`,
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error creating table:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create table',
        details: error
      },
      { status: 500 }
    );
  }
}

// Alter table structure
export async function PUT(request: NextRequest) {
  try {
    const { connectionUrl, tableName, operation, column } = await request.json();
    
    if (!connectionUrl || !tableName || !operation) {
      return NextResponse.json(
        { error: 'Connection URL, table name, and operation are required' },
        { status: 400 }
      );
    }

    // Create a new connection pool
    const pool = new Pool({
      connectionString: connectionUrl,
      connectionTimeoutMillis: 5000,
    });

    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      let query = '';
      
      switch (operation) {
        case 'addColumn':
          if (!column || !column.name || !column.type) {
            return NextResponse.json(
              { error: 'Column name and type are required for adding a column' },
              { status: 400 }
            );
          }
          
          query = `ALTER TABLE "${tableName}" ADD COLUMN "${column.name}" ${column.type}`;
          
          if (column.notNull) {
            query += ' NOT NULL';
          }
          
          if (column.default !== undefined && column.default !== null) {
            query += ` DEFAULT ${column.default}`;
          }
          
          break;
          
        case 'dropColumn':
          if (!column || !column.name) {
            return NextResponse.json(
              { error: 'Column name is required for dropping a column' },
              { status: 400 }
            );
          }
          
          query = `ALTER TABLE "${tableName}" DROP COLUMN "${column.name}"`;
          break;
          
        case 'renameColumn':
          if (!column || !column.name || !column.newName) {
            return NextResponse.json(
              { error: 'Column name and new name are required for renaming a column' },
              { status: 400 }
            );
          }
          
          query = `ALTER TABLE "${tableName}" RENAME COLUMN "${column.name}" TO "${column.newName}"`;
          break;
          
        case 'renameTable':
          if (!column || !column.newName) {
            return NextResponse.json(
              { error: 'New table name is required for renaming a table' },
              { status: 400 }
            );
          }
          
          query = `ALTER TABLE "${tableName}" RENAME TO "${column.newName}"`;
          break;
          
        default:
          return NextResponse.json(
            { error: 'Invalid operation' },
            { status: 400 }
          );
      }
      
      // Execute the query
      await client.query(query);
      
      return NextResponse.json({
        success: true,
        message: `Table ${tableName} altered successfully`,
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error altering table:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to alter table',
        details: error
      },
      { status: 500 }
    );
  }
}

// Drop table
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionUrl = searchParams.get('connectionUrl');
    const tableName = searchParams.get('tableName');
    
    if (!connectionUrl || !tableName) {
      return NextResponse.json(
        { error: 'Connection URL and table name are required' },
        { status: 400 }
      );
    }

    // Create a new connection pool
    const pool = new Pool({
      connectionString: connectionUrl,
      connectionTimeoutMillis: 5000,
    });

    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Construct the DROP TABLE query
      const query = `DROP TABLE "${tableName}";`;
      
      // Execute the query
      await client.query(query);
      
      return NextResponse.json({
        success: true,
        message: `Table ${tableName} dropped successfully`,
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error dropping table:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to drop table',
        details: error
      },
      { status: 500 }
    );
  }
}