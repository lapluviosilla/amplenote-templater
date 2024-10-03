/**
 * Generates a random UUID.
 * @returns {string} - A randomly generated UUID
 */
export function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

/**
 * Generates a simple 4-character UUID using a similar technique to the standard UUID generator.
 * @returns {string} - A 4-character UUID
 */
export function generateShortUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11)
    .replace(/[018]/g, (c) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    )
    .substring(0, 4); // Limit the output to the first 4 characters
}
