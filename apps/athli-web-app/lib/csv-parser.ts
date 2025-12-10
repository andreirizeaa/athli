export interface ParsedCSV {
  headers: string[];
  rows: string[][];
  isValid: boolean;
  error?: string;
  clients?: ClientData[];
}

export interface ClientData {
  firstName: string;
  lastName: string;
  email: string;
  category: string;
}

const REQUIRED_COLUMNS = ['FIRST NAME', 'LAST NAME', 'EMAIL', 'CATEGORY'];

const removeDuplicates = (clients: ClientData[]): ClientData[] => {
  const seen = new Set<string>();
  const unique: ClientData[] = [];

  for (const client of clients) {
    // Use email as primary key for deduplication, fallback to name combination
    const emailKey = client.email.toLowerCase().trim();
    const nameKey = `${client.firstName.toLowerCase().trim()}-${client.lastName.toLowerCase().trim()}`;
    const key = emailKey || nameKey;

    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(client);
    }
  }

  return unique;
};

export const parseCSV = async (file: File): Promise<ParsedCSV> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        resolve({
          headers: [],
          rows: [],
          isValid: false,
          error: 'Failed to read file',
        });
        return;
      }

      const lines = text.split('\n').filter((line) => line.trim() !== '');
      if (lines.length === 0) {
        resolve({
          headers: [],
          rows: [],
          isValid: false,
          error: 'CSV file is empty',
        });
        return;
      }

      // Parse headers (first line)
      const headers = lines[0]
        .split(',')
        .map((header) => header.trim().toUpperCase())
        .filter((header) => header !== '');

      // Check if all required columns are present
      const missingColumns = REQUIRED_COLUMNS.filter((required) => !headers.includes(required));

      if (missingColumns.length > 0) {
        resolve({
          headers,
          rows: [],
          isValid: false,
          error: `Missing required columns: ${missingColumns.join(', ')}`,
        });
        return;
      }

      // Parse rows (skip header)
      const rows = lines.slice(1).map((line) => {
        return line.split(',').map((cell) => cell.trim());
      });

      // Map rows to structured client data
      const firstNameIndex = headers.indexOf('FIRST NAME');
      const lastNameIndex = headers.indexOf('LAST NAME');
      const emailIndex = headers.indexOf('EMAIL');
      const categoryIndex = headers.indexOf('CATEGORY');

      const clients: ClientData[] = rows
        .filter((row) => row.length > 0 && row.some((cell) => cell.trim() !== ''))
        .map((row) => ({
          firstName: row[firstNameIndex] || '',
          lastName: row[lastNameIndex] || '',
          email: row[emailIndex] || '',
          category: row[categoryIndex] || '',
        }))
        .filter((client) => client.firstName || client.lastName || client.email);

      // Remove duplicates based on email (case-insensitive)
      const uniqueClients = removeDuplicates(clients);

      resolve({
        headers,
        rows,
        isValid: true,
        clients: uniqueClients,
      });
    };

    reader.onerror = () => {
      resolve({
        headers: [],
        rows: [],
        isValid: false,
        error: 'Error reading file',
      });
    };

    reader.readAsText(file);
  });
};
