// Test date parsing logic
console.log('Testing date parsing...');

// Test 1: Parse DD-MM-YYYY format
const parseDateString = (dateStr) => {
  if (!dateStr) return new Date();
  
  // Check if it's already in ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    console.log('ISO format detected:', dateStr, '->', isoDate.toISOString());
    return isoDate;
  }
  
  // Parse DD-MM-YYYY format
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);  // First part is day
    const month = parseInt(parts[1], 10) - 1; // Second part is month (0-indexed)
    const year = parseInt(parts[2], 10);
    
    // Create date with correct order: year, month, day
    const date = new Date(year, month, day);
    console.log(`DD-MM-YYYY format - ${dateStr} -> day: ${day}, month: ${month + 1}, year: ${year} -> ${date.toISOString()}`);
    return date;
  }
  
  return new Date();
};

// Test 2: Format date to DD-MM-YYYY
const formatDateToDDMMYYYY = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  return `${day}-${month}-${year}`;
};

// Test cases
console.log('\n=== Test Cases ===');

// Test case 1: Event date from database (01-12-2025 = December 1st, 2025)
console.log('\nTest 1: Event date 01-12-2025 (should be December 1st, 2025)');
const eventDate = '01-12-2025';
const parsedEventDate = parseDateString(eventDate);
console.log('Parsed date:', parsedEventDate.toISOString());
console.log('Formatted back:', formatDateToDDMMYYYY(parsedEventDate));

// Test case 2: ISO date
console.log('\nTest 2: ISO date 2025-12-01');
const isoDate = '2025-12-01';
const parsedIsoDate = parseDateString(isoDate);
console.log('Parsed date:', parsedIsoDate.toISOString());
console.log('Formatted back:', formatDateToDDMMYYYY(parsedIsoDate));

// Test case 3: Create date from year, month, day
console.log('\nTest 3: Create date from components (2025, 11, 1) = December 1st, 2025');
const manualDate = new Date(2025, 11, 1); // Month is 0-indexed, so 11 = December
console.log('Manual date:', manualDate.toISOString());
console.log('Formatted:', formatDateToDDMMYYYY(manualDate)); 