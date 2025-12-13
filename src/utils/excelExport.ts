/**
 * CSV Export Utility
 * Exports data to CSV format (safe, no dependencies, Excel-compatible)
 */

export interface CSVExportOptions {
  filename?: string;
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If value contains comma, newline, or double quote, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Convert array to CSV string
 */
function arrayToCSV(data: any[][]): string {
  return data.map(row => row.map(escapeCSVField).join(',')).join('\n');
}

/**
 * Export data to CSV file
 */
export function exportToCSV(
  data: any[],
  columns: { key: string; header: string }[],
  options: CSVExportOptions = {}
): void {
  try {
    // Prepare CSV data
    const csvData = [
      // Header row
      columns.map(col => col.header),
      // Data rows
      ...data.map(row =>
        columns.map(col => {
          const value = row[col.key];
          // Format dates
          if (value instanceof Date) {
            return value.toLocaleDateString();
          }
          // Handle null/undefined
          return value ?? '';
        })
      ),
    ];
    
    // Convert to CSV string
    const csvString = arrayToCSV(csvData);
    
    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const filename = options.filename || `export_${new Date().toISOString().split('T')[0]}.csv`;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
}

/**
 * Export leave report to CSV
 */
export function exportLeaveReport(
  leaves: any[],
  summary: any,
  month?: number,
  year?: number
): void {
  const columns = [
    { key: 'employee_name', header: 'Employee Name' },
    { key: 'emp_code', header: 'Employee Code' },
    { key: 'leave_type', header: 'Leave Type' },
    { key: 'start_date', header: 'Start Date' },
    { key: 'end_date', header: 'End Date' },
    { key: 'duration', header: 'Duration (Days)' },
    { key: 'status', header: 'Status' },
    { key: 'reason', header: 'Reason' },
    { key: 'approved_by_name', header: 'Approved By' },
    { key: 'applied_at', header: 'Applied At' },
  ];
  
  // Format dates in data
  const formattedData = leaves.map(leave => ({
    ...leave,
    start_date: leave.start_date ? new Date(leave.start_date).toLocaleDateString() : '',
    end_date: leave.end_date ? new Date(leave.end_date).toLocaleDateString() : '',
    applied_at: leave.applied_at ? new Date(leave.applied_at).toLocaleDateString() : '',
    approved_at: leave.approved_at ? new Date(leave.approved_at).toLocaleDateString() : '',
  }));
  
  const monthName = month ? new Date(year || new Date().getFullYear(), month - 1).toLocaleString('default', { month: 'long' }) : '';
  const filename = `leave_report_${monthName}_${year || new Date().getFullYear()}.csv`;
  
  exportToCSV(formattedData, columns, { filename });
}
