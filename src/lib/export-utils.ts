/**
 * Utility functions for exporting data in different formats
 */

/**
 * Convert data to CSV format and trigger download
 * @param columns - Array of column names
 * @param rows - Array of data rows
 * @param filename - Name of the file to download
 */
export function exportToCSV(columns: string[], rows: Record<string, any>[], filename: string = 'export.csv') {
  // Create CSV header row
  let csvContent = columns.join(',') + '\n';
  
  // Add data rows
  rows.forEach(row => {
    const rowValues = columns.map(column => {
      const value = row[column];
      // Handle null values
      if (value === null) return '';
      // Handle objects and arrays by converting to JSON string
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      // Handle strings with commas by wrapping in quotes
      if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
      // Return value as is
      return value;
    }).join(',');
    csvContent += rowValues + '\n';
  });
  
  // Create a blob and trigger download
  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Convert data to JSON format and trigger download
 * @param rows - Array of data rows
 * @param filename - Name of the file to download
 */
export function exportToJSON(rows: Record<string, any>[], filename: string = 'export.json') {
  const jsonContent = JSON.stringify(rows, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

/**
 * Helper function to trigger file download
 * @param content - File content
 * @param filename - Name of the file to download
 * @param contentType - MIME type of the file
 */
function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link element and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}