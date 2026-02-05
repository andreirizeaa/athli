/**
 * Search utility functions for filtering and matching text
 */

/**
 * Fuzzy search function that checks if query matches text
 * Allows for character skipping and partial matches
 *
 * @param text - The text to search in
 * @param query - The search query
 * @returns true if query matches text, false otherwise
 *
 * @example
 * fuzzyMatch('John Doe', 'jd') // true
 * fuzzyMatch('React Native', 'rn') // true
 * fuzzyMatch('TypeScript', 'script') // true
 */
export const fuzzyMatch = (text: string, query: string): boolean => {
  if (!query) return true;

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact substring match
  if (textLower.includes(queryLower)) return true;

  // Fuzzy match: check if all query characters appear in order in the text
  let textIndex = 0;
  for (let i = 0; i < queryLower.length; i++) {
    const char = queryLower[i];
    const foundIndex = textLower.indexOf(char, textIndex);
    if (foundIndex === -1) {
      return false;
    }
    textIndex = foundIndex + 1;
  }
  return true;
};
