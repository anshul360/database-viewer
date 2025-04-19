import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST(request: NextRequest) {
  try {
    const { connectionUrl, query } = await request.json();
    // Create a new connection pool
    const pool = new Pool({
      connectionString: connectionUrl,
      connectionTimeoutMillis: 5000,
    });
    // Check if the connection URL is provided
    if (!connectionUrl) {
      return NextResponse.json(
        { error: 'Connection URL is required' },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Execute the query
    const result = await pool.query(query);
    //`${query}`;

    // Extract column names from the fields
    const columns = result.fields.map((field: any) => field.name);

    return NextResponse.json({
      columns,
      rows: result.rows,
      rowCount: result.rowCount,
    });
  } catch (error) {
    console.error('Error executing query:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}