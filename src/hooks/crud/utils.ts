/**
 * CRUD Utility Functions
 *
 * Helper functions for data conversion and parsing.
 */

/**
 * Convert table name to API endpoint
 *
 * @param table - Table name with underscores (e.g., 'portfolio_items')
 * @returns API endpoint with hyphens (e.g., 'portfolio-items')
 */
export function tableToEndpoint(table: string): string {
  return table.replace(/_/g, '-');
}

/**
 * Convert array of objects to CSV blob
 *
 * @param data - Array of objects to convert
 * @returns CSV blob
 */
export function convertToCSV(data: unknown[]): Blob {
  if (!data || data.length === 0) {
    throw new Error('No data to convert to CSV');
  }

  // Get headers from first object
  const headers = Object.keys(data[0] as Record<string, unknown>);

  // Create CSV header row
  const csvRows = [headers.join(',')];

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = (row as Record<string, unknown>)[header];

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Convert to string and escape quotes
      const escaped = String(value).replace(/"/g, '""');

      // Wrap in quotes if contains comma, newline, or quote
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }

      return escaped;
    });

    csvRows.push(values.join(','));
  }

  return new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Parse CSV text to array of objects
 *
 * @param text - CSV text content
 * @returns Array of parsed objects
 */
export function parseCSV(text: string): unknown[] {
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const records: unknown[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length !== headers.length) {
      console.warn(
        `[parseCSV] Row ${i + 1} has ${values.length} values but expected ${headers.length}. Skipping.`
      );
      continue;
    }

    const record: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const value = values[j];

      // Try to parse as number
      if (value && !isNaN(Number(value))) {
        record[headers[j]] = Number(value);
      }
      // Try to parse as boolean
      else if (value === 'true' || value === 'false') {
        record[headers[j]] = value === 'true';
      }
      // Try to parse as null
      else if (value === '' || value === 'null' || value === 'NULL') {
        record[headers[j]] = null;
      }
      // Keep as string
      else {
        record[headers[j]] = value;
      }
    }

    records.push(record);
  }

  return records;
}

/**
 * Parse a single CSV line, handling quoted values
 *
 * @param line - CSV line to parse
 * @returns Array of values
 */
export function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last value
  values.push(current);

  return values;
}
