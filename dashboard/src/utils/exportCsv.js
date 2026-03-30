/**
 * CSV Export Utility
 * Takes an array of objects and triggers a CSV file download.
 * Handles proper escaping of commas, quotes, and newlines.
 */

function escapeCsvValue(val) {
  if (val == null) return '';
  const str = String(val);
  // If the value contains a comma, quote, or newline, wrap it in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Export an array of objects as a CSV file download.
 *
 * @param {Object[]} data - Array of row objects
 * @param {Object[]} columns - Array of { key, label } defining column order and header names.
 *   `key` can be a dotted path (e.g. "gases.H2") or a function (row) => value.
 * @param {string} filename - Name of the downloaded file (e.g. "export.csv")
 */
export function exportCsv(data, columns, filename = 'export.csv') {
  if (!data || data.length === 0) return;

  const resolve = (row, key) => {
    if (typeof key === 'function') return key(row);
    // Support dotted paths like "gases.H2"
    return key.split('.').reduce((obj, k) => obj?.[k], row);
  };

  const headerRow = columns.map(c => escapeCsvValue(c.label)).join(',');

  const bodyRows = data.map(row =>
    columns.map(c => escapeCsvValue(resolve(row, c.key))).join(',')
  );

  const csvContent = [headerRow, ...bodyRows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
