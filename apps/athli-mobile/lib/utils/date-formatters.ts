const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Format date as dd-mm-yyyy
export const formatDateDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

// Format date as yyyy-mm-dd (ISO format for API keys)
export const formatDateYYYYMMDD = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

// Format date as "Mar 24" for button
export const formatDateShort = (date: Date): string => {
  const month = MONTH_NAMES_SHORT[date.getMonth()];
  const day = date.getDate();
  return `${month} ${day}`;
};

// Format date as "Mar 24" for page title (month abbreviation + last 2 digits of year)
export const formatDateMonthYearShort = (date: Date): string => {
  const month = MONTH_NAMES_SHORT[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2); // Last 2 digits
  return `${month} ${year}`;
};








