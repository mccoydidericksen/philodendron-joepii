'use server';

import { CSV_HEADERS, CSV_HEADER_LABELS, CSV_EXAMPLE_ROW } from '@/lib/validations/bulk-plant';

/**
 * Generates a CSV template for bulk plant upload
 * Returns CSV content as a string that can be downloaded by the client
 */
export async function generatePlantCSVTemplate() {
  try {
    // Create header row with human-readable labels
    const headerRow = CSV_HEADERS.map(
      (header) => CSV_HEADER_LABELS[header as keyof typeof CSV_HEADER_LABELS]
    );

    // Create second row with field names (for reference)
    const fieldNameRow = CSV_HEADERS.map((header) => header);

    // Create example data row
    const exampleRow = CSV_HEADERS.map(
      (header) => CSV_EXAMPLE_ROW[header as keyof typeof CSV_EXAMPLE_ROW] || ''
    );

    // Combine rows into CSV format
    const rows = [headerRow, fieldNameRow, exampleRow];

    // Convert to CSV string with proper escaping
    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(',')
      )
      .join('\n');

    return {
      success: true,
      data: csvContent,
      filename: `plant-upload-template-${new Date().toISOString().split('T')[0]}.csv`,
    };
  } catch (error) {
    console.error('Error generating CSV template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate template',
    };
  }
}

/**
 * Alternative: Generate a simpler template with just field names and one example
 */
export async function generateSimplePlantCSVTemplate() {
  try {
    // Just use the actual field names as headers
    const headerRow = CSV_HEADERS;

    // Create example data row
    const exampleRow = CSV_HEADERS.map(
      (header) => CSV_EXAMPLE_ROW[header as keyof typeof CSV_EXAMPLE_ROW] || ''
    );

    const rows = [headerRow, exampleRow];

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(',')
      )
      .join('\n');

    return {
      success: true,
      data: csvContent,
      filename: `plant-upload-template-${new Date().toISOString().split('T')[0]}.csv`,
    };
  } catch (error) {
    console.error('Error generating simple CSV template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate template',
    };
  }
}
