// Helper function to format date to DD-MM-YYYY
export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    // If it's already a string in DD-MM-YYYY format, return it
    if (/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/.test(date)) {
      return date;
    }
    // Otherwise parse it as a date
    date = new Date(date);
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
};

// Helper function to format date to DD-MM-YYYY HH:mm
export const formatDateTime = (date: Date | string): string => {
  if (typeof date === 'string') {
    // If it's already in the correct format, return it
    if (/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4} ([01][0-9]|2[0-3]):[0-5][0-9]$/.test(date)) {
      return date;
    }
    // Otherwise parse it as a date
    date = new Date(date);
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}; 