import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    console.log('Connecting to database with URL:', url.replace(/:[^:]*@/, ':****@')); // Log URL with password masked
    
    if (!url) {
      return NextResponse.json(
        { error: 'Database connection URL is required' },
        { status: 400 }
      );
    }

    // Create a new connection pool
    const pool = new Pool({
      connectionString: url,
      // Set a short timeout for the connection test
      connectionTimeoutMillis: 5000,
    });

    // Test the connection by getting a client and releasing it
    const client = await pool.connect();
    
    // Get the list of tables in the database
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(tablesResult)
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // Release the client back to the pool
    client.release();
    
    // End the pool
    await pool.end();

    return NextResponse.json({ success: true, tables });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to connect to database',
        details: error
      },
      { status: 500 }
    );
  }
}