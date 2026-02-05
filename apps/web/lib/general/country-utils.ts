import { getCountries } from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';

// Build a reverse mapping from country names to ISO codes
const countryNameToCode: Record<string, Country> = {};

// Initialize the mapping
getCountries().forEach((code) => {
  const name = en[code as keyof typeof en];
  if (name) {
    // Store both the exact name and lowercase version for case-insensitive matching
    countryNameToCode[name] = code;
    countryNameToCode[name.toLowerCase()] = code;
  }
});

/**
 * Converts a country value (either full name or ISO code) to ISO 2-letter code.
 * Returns undefined if the country cannot be found.
 * 
 * @param countryValue - Either a full country name ("Andorra") or ISO code ("AD")
 * @returns The ISO 2-letter country code or undefined
 */
export const getCountryCode = (countryValue: string | null | undefined): Country | undefined => {
  if (!countryValue) return undefined;
  
  // If it's already a 2-letter code, validate and return it
  if (countryValue.length === 2) {
    const upperCode = countryValue.toUpperCase() as Country;
    // Check if it's a valid ISO code
    if (getCountries().includes(upperCode)) {
      return upperCode;
    }
  }
  
  // Try to find by exact name match
  if (countryNameToCode[countryValue]) {
    return countryNameToCode[countryValue];
  }
  
  // Try case-insensitive match
  const lowerValue = countryValue.toLowerCase();
  if (countryNameToCode[lowerValue]) {
    return countryNameToCode[lowerValue];
  }
  
  return undefined;
};

/**
 * Gets the country name from a country value (either full name or ISO code).
 * 
 * @param countryValue - Either a full country name ("Andorra") or ISO code ("AD")
 * @returns The full country name or the original value if not found
 */
export const getCountryName = (countryValue: string | null | undefined): string | undefined => {
  if (!countryValue) return undefined;
  
  const code = getCountryCode(countryValue);
  if (code) {
    return en[code as keyof typeof en] || countryValue;
  }
  
  // If we can't find a code, return the original value
  // It might already be a valid country name
  return countryValue;
};

/**
 * Converts a country code to a flag emoji using Unicode regional indicators.
 * 
 * @param countryValue - Either a full country name ("Andorra") or ISO code ("AD")
 * @returns The flag emoji or null if the country cannot be found
 */
export const getFlagEmoji = (countryValue: string | null | undefined): string | null => {
  const code = getCountryCode(countryValue);
  if (!code) return null;
  
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

/**
 * Checks if a country value is valid (either as a name or ISO code).
 * 
 * @param countryValue - The value to check
 * @returns True if the value represents a valid country
 */
export const isValidCountry = (countryValue: string | null | undefined): boolean => {
  return getCountryCode(countryValue) !== undefined;
};
