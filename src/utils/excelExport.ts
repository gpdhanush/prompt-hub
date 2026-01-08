/**
 * Export Utilities
 * Exports data to CSV, Excel, and PDF formats
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

/**
 * Excel Export Options
 */
export interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
}

/**
 * Export data to Excel format (CSV with .xlsx extension)
 * Excel can open CSV files natively
 */
export function exportToExcel(
  data: any[],
  columns: { key: string; header: string }[],
  options: ExcelExportOptions = {}
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
          // Format dates using DD-MMM-YYYY format
          const displayValue = formatDateForExport(value);
          return displayValue;
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

    // Generate filename with .xlsx extension
    const filename = options.filename || `export_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
}

/**
 * PDF Export Options
 */
export interface PDFExportOptions {
  filename?: string;
  title?: string;
}

/**
 * Format date to DD-MMM-YYYY format
 */
function formatDateForExport(dateValue: any): string {
  if (!dateValue) return '';

  let date: Date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'string') {
    // Handle ISO date strings
    date = new Date(dateValue);
  } else {
    return dateValue.toString();
  }

  if (isNaN(date.getTime())) {
    return dateValue.toString();
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Export data to PDF format using browser print functionality
 */
export function exportToPDF(
  data: any[],
  columns: { key: string; header: string }[],
  options: PDFExportOptions = {}
): void {
  try {
    // Create a printable HTML table
    const tableHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${options.title || 'Data Export'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            h1 {
              color: #2563eb;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }
            th {
              background-color: #2563eb;
              font-weight: bold;
              color: #ffffff;
            }
            .duration-column {
              text-align: center !important;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            tr:hover {
              background-color: #f3f4f6;
            }
            .export-info {
              margin-bottom: 20px;
              font-size: 14px;
              color: #6b7280;
            }
            @media print {
              body { margin: 0; }
              @page {
                size: landscape;
                margin: 0.5in;
              }
              table {
                font-size: 10px;
              }
              th, td {
                padding: 4px;
              }
            }
          </style>
        </head>
        <body>
          <h1 style="font-size: 16px; color: #2563eb; margin-bottom: 5px;">${options.title || 'Data Export'}</h1>
            <div class="export-info" style="font-size: 12px; margin-bottom: 15px;">
            Generated on: ${formatDateForExport(new Date())} ${new Date().toLocaleTimeString('en-US', { hour12: true })}<br>
            Total records: ${data.length}
          </div>
          <table>
            <thead>
              <tr>
                ${columns.map(col => {
                  const className = col.key === 'duration' ? ' class="duration-column"' : '';
                  return `<th${className}>${col.header}</th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${columns.map(col => {
                    const value = row[col.key];
                    const displayValue = formatDateForExport(value);
                    const className = col.key === 'duration' ? ' class="duration-column"' : '';
                    return `<td${className}>${displayValue}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #ddd; padding-top: 15px;">
            <p>Powered by Neathra EMS</p>
          </div>
        </body>
      </html>
    `;

    // Create a new window with the HTML content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check your popup blocker settings.');
    }

    printWindow.document.write(tableHtml);
    printWindow.document.close();

    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      // Small delay to ensure all content is rendered
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing (user can cancel print)
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    };

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

/**
 * Export leave report to Excel
 */
export function exportLeaveReportExcel(
  leaves: any[],
  summary?: any,
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
    { key: 'created_at', header: 'Applied Date' },
  ];

  // Format dates in data
  const formattedData = leaves.map(leave => ({
    ...leave,
    start_date: leave.start_date ? new Date(leave.start_date).toLocaleDateString() : '',
    end_date: leave.end_date ? new Date(leave.end_date).toLocaleDateString() : '',
    created_at: leave.created_at ? new Date(leave.created_at).toLocaleDateString() : '',
    approved_at: leave.approved_at ? new Date(leave.approved_at).toLocaleDateString() : '',
  }));

  const monthName = month ? new Date(year || new Date().getFullYear(), month - 1).toLocaleString('default', { month: 'long' }) : '';
  const filename = `leave_report_${monthName}_${year || new Date().getFullYear()}.xlsx`;

  exportToExcel(formattedData, columns, { filename });
}

/**
 * Export leave report to PDF
 */
export function exportLeaveReportPDF(
  leaves: any[],
  summary?: any,
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
    { key: 'created_at', header: 'Applied Date' },
  ];

  // Format dates in data
  const formattedData = leaves.map(leave => ({
    ...leave,
    start_date: leave.start_date ? new Date(leave.start_date).toLocaleDateString() : '',
    end_date: leave.end_date ? new Date(leave.end_date).toLocaleDateString() : '',
    created_at: leave.created_at ? new Date(leave.created_at).toLocaleDateString() : '',
    approved_at: leave.approved_at ? new Date(leave.approved_at).toLocaleDateString() : '',
  }));

  const currentDate = formatDateForExport(new Date());
  const title = `${currentDate}`;
  const filename = `leave_report_${currentDate.replace(/-/g, '_')}.pdf`;

  exportToPDF(formattedData, columns, { filename, title });
}
