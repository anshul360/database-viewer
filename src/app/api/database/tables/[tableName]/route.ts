import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: NextRequest, { params }: { params: { tableName: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionUrl = searchParams.get('connectionUrl');
    const tableName = params.tableName;
    
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
      // Get table structure
      const structureQuery = `
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          character_maximum_length
        FROM 
          information_schema.columns 
        WHERE 
          table_name = $1 AND table_schema = 'public'
        ORDER BY 
          ordinal_position;
      `;
      
      const structureResult = await client.query(structureQuery, [tableName]);
      
      // Get primary key information
      const pkQuery = `
        SELECT 
          kcu.column_name 
        FROM 
          information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE 
          tc.constraint_type = 'PRIMARY KEY' 
          AND tc.table_name = $1
          AND tc.table_schema = 'public';
      `;
      
      const pkResult = await client.query(pkQuery, [tableName]);
      const primaryKeys = pkResult.rows.map(row => row.column_name);
      
      // Get foreign key information
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM
          information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE
          tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
          AND tc.table_schema = 'public';
      `;
      
      const fkResult = await client.query(fkQuery, [tableName]);
      
      // Get sample data (first 10 rows)
      const dataQuery = `
        SELECT * FROM "${tableName}" LIMIT 10;
      `;
      
      const dataResult = await client.query(dataQuery);
      
      // Get total row count
      const countQuery = `
        SELECT COUNT(*) FROM "${tableName}";
      `;
      
      const countResult = await client.query(countQuery);
      const totalRows = parseInt(countResult.rows[0].count, 10);
      
      return NextResponse.json({
        structure: structureResult.rows,
        primaryKeys,
        foreignKeys: fkResult.rows,
        data: dataResult.rows,
        totalRows,
      });
    } finally {
      // Release the client back to the pool
      client.release();
      
      // End the pool
      await pool.end();
    }
  } catch (error) {
    console.error('Error fetching table information:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch table information',
        details: error
      },
      { status: 500 }
    );
  }
}