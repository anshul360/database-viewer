import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Get data from a table with pagination and filtering
export async function GET(request: NextRequest, { params }: { params: { tableName: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionUrl = searchParams.get('connectionUrl');
    const tableName = params.tableName;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const orderBy = searchParams.get('orderBy');
    const orderDirection = searchParams.get('orderDirection') || 'ASC';
    const filter = searchParams.get('filter');
    
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
      // Calculate offset
      const offset = (page - 1) * pageSize;
      
      // Construct the base query
      let query = `SELECT * FROM "${tableName}"`;
      let countQuery = `SELECT COUNT(*) FROM "${tableName}"`;
      const queryParams = [];
      
      // Add filter if provided
      if (filter) {
        query += ` WHERE ${filter}`;
        countQuery += ` WHERE ${filter}`;
      }
      
      // Add order by if provided
      if (orderBy) {
        query += ` ORDER BY "${orderBy}" ${orderDirection}`;
      }
      
      // Add pagination
      query += ` LIMIT ${pageSize} OFFSET ${offset}`;
      
      // Execute the queries
      const dataResult = await client.query(query, queryParams);
      const countResult = await client.query(countQuery, queryParams);
      
      const totalRows = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalRows / pageSize);
      
      return NextResponse.json({
        data: dataResult.rows,
        pagination: {
          page,
          pageSize,
          totalRows,
          totalPages,
        },
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        details: error
      },
      { status: 500 }
    );
  }
}

// Insert data into a table
export async function POST(request: NextRequest, { params }: { params: { tableName: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionUrl = searchParams.get('connectionUrl');
    const tableName = params.tableName;
    const data = await request.json();
    
    if (!connectionUrl || !tableName) {
      return NextResponse.json(
        { error: 'Connection URL and table name are required' },
        { status: 400 }
      );
    }

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No data provided for insertion' },
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
      // Extract column names and values from the data object
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      // Create placeholders for the query
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      // Construct the query
      const query = `
        INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')})
        VALUES (${placeholders})
        RETURNING *;
      `;
      
      // Execute the query
      const result = await client.query(query, values);
      
      return NextResponse.json({
        success: true,
        data: result.rows[0],
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error inserting data:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to insert data',
        details: error
      },
      { status: 500 }
    );
  }
}

// Update data in a table
export async function PUT(request: NextRequest, { params }: { params: { tableName: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionUrl = searchParams.get('connectionUrl');
    const tableName = params.tableName;
    const { data, condition } = await request.json();
    
    if (!connectionUrl || !tableName) {
      return NextResponse.json(
        { error: 'Connection URL and table name are required' },
        { status: 400 }
      );
    }

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No data provided for update' },
        { status: 400 }
      );
    }

    if (!condition) {
      return NextResponse.json(
        { error: 'Update condition is required' },
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
      // Extract column names and values from the data object
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      // Create SET clause for the query
      const setClause = columns.map((col, index) => `"${col}" = $${index + 1}`).join(', ');
      
      // Construct the query
      const query = `
        UPDATE "${tableName}"
        SET ${setClause}
        WHERE ${condition}
        RETURNING *;
      `;
      
      // Execute the query
      const result = await client.query(query, values);
      
      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'No rows were updated. The condition may not match any rows.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: result.rows,
        rowsAffected: result.rowCount,
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error updating data:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update data',
        details: error
      },
      { status: 500 }
    );
  }
}

// Delete data from a table
export async function DELETE(request: NextRequest, { params }: { params: { tableName: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionUrl = searchParams.get('connectionUrl');
    const tableName = params.tableName;
    const condition = searchParams.get('condition');
    
    if (!connectionUrl || !tableName) {
      return NextResponse.json(
        { error: 'Connection URL and table name are required' },
        { status: 400 }
      );
    }

    if (!condition) {
      return NextResponse.json(
        { error: 'Delete condition is required' },
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
      // Construct the query
      const query = `
        DELETE FROM "${tableName}"
        WHERE ${condition}
        RETURNING *;
      `;
      
      // Execute the query
      const result = await client.query(query);
      
      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'No rows were deleted. The condition may not match any rows.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: result.rows,
        rowsAffected: result.rowCount,
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error deleting data:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete data',
        details: error
      },
      { status: 500 }
    );
  }
}