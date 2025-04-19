import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Get all RLS policies for the database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionUrl = searchParams.get('connectionUrl');
    const tableName = searchParams.get('tableName');
    
    if (!connectionUrl) {
      return NextResponse.json(
        { error: 'Database connection URL is required' },
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
      // Query to get RLS policies
      let query = `
        SELECT 
          n.nspname AS schema_name,
          c.relname AS table_name,
          pol.polname AS policy_name,
          CASE pol.polpermissive WHEN 't' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS policy_type,
          CASE pol.polcmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            WHEN '*' THEN 'ALL'
          END AS command,
          pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
          pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression,
          ARRAY(
            SELECT pg_get_userbyid(pol.polroles[i])
            FROM generate_series(1, array_length(pol.polroles, 1)) AS i
          ) AS roles
        FROM pg_policy pol
        JOIN pg_class c ON c.oid = pol.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
      `;
      
      const queryParams = [];
      
      // Filter by table name if provided
      if (tableName) {
        query += ` WHERE c.relname = $1`;
        queryParams.push(tableName);
      } else {
        query += ` WHERE n.nspname = 'public'`;
      }
      
      query += ` ORDER BY schema_name, table_name, policy_name;`;
      
      const result = await client.query(query, queryParams);
      
      // Get tables with RLS enabled
      const rlsEnabledQuery = `
        SELECT 
          n.nspname AS schema_name,
          c.relname AS table_name,
          c.relrowsecurity AS rls_enabled,
          c.relforcerowsecurity AS rls_forced
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY schema_name, table_name;
      `;
      
      const rlsEnabledResult = await client.query(rlsEnabledQuery);
      
      return NextResponse.json({
        policies: result.rows,
        tablesWithRls: rlsEnabledResult.rows,
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error fetching RLS policies:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch RLS policies',
        details: error
      },
      { status: 500 }
    );
  }
}

// Create or update RLS policy
export async function POST(request: NextRequest) {
  try {
    const { connectionUrl, tableName, policyName, command, using, withCheck, roles } = await request.json();
    
    if (!connectionUrl || !tableName || !policyName) {
      return NextResponse.json(
        { error: 'Connection URL, table name, and policy name are required' },
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
      // First, enable row level security on the table if not already enabled
      await client.query(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
      
      // Check if policy already exists
      const checkQuery = `
        SELECT 1 FROM pg_policy 
        WHERE polname = $1 AND polrelid = (SELECT oid FROM pg_class WHERE relname = $2);
      `;
      
      const checkResult = await client.query(checkQuery, [policyName, tableName]);
      
      let query;
      if (checkResult.rowCount > 0) {
        // Update existing policy
        query = `DROP POLICY "${policyName}" ON "${tableName}";`;
        await client.query(query);
      }
      
      // Create policy
      query = `CREATE POLICY "${policyName}" ON "${tableName}"`;
      
      // Add command if provided
      if (command && command !== 'ALL') {
        query += ` FOR ${command}`;
      }
      
      // Add roles if provided
      if (roles && roles.length > 0) {
        query += ` TO ${roles.join(', ')}`;
      }
      
      // Add USING expression if provided
      if (using) {
        query += ` USING (${using})`;
      }
      
      // Add WITH CHECK expression if provided
      if (withCheck) {
        query += ` WITH CHECK (${withCheck})`;
      }
      
      query += `;`;
      
      await client.query(query);
      
      return NextResponse.json({
        success: true,
        message: `Policy ${policyName} created/updated successfully`,
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error creating/updating RLS policy:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create/update RLS policy',
        details: error
      },
      { status: 500 }
    );
  }
}

// Delete RLS policy
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionUrl = searchParams.get('connectionUrl');
    const tableName = searchParams.get('tableName');
    const policyName = searchParams.get('policyName');
    
    if (!connectionUrl || !tableName || !policyName) {
      return NextResponse.json(
        { error: 'Connection URL, table name, and policy name are required' },
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
      // Delete the policy
      const query = `DROP POLICY IF EXISTS "${policyName}" ON "${tableName}";`;
      await client.query(query);
      
      return NextResponse.json({
        success: true,
        message: `Policy ${policyName} deleted successfully`,
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error deleting RLS policy:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete RLS policy',
        details: error
      },
      { status: 500 }
    );
  }
}