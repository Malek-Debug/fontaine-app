/**
 * Generates unique alphanumeric codes for class join codes and game session codes.
 *
 * Uses uppercase letters and digits, excluding ambiguous characters:
 *   Excluded: 0 (zero), O (oh), 1 (one), I (eye), L (ell)
 *
 * This gives 31 possible characters, producing 31^6 = ~887 million
 * possible 6-character codes -- more than enough to avoid collisions.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

/**
 * Generate a random code of the given length.
 * Uses crypto.getRandomValues when available for better randomness.
 */
function randomCode(length: number): string {
  const chars: string[] = []

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(length)
    crypto.getRandomValues(values)
    for (let i = 0; i < length; i++) {
      chars.push(ALPHABET[values[i] % ALPHABET.length])
    }
  } else {
    for (let i = 0; i < length; i++) {
      chars.push(ALPHABET[Math.floor(Math.random() * ALPHABET.length)])
    }
  }

  return chars.join("")
}

/**
 * Generate a unique 6-character class join code.
 * Checks for uniqueness against existing codes in the database.
 */
export async function generateClassJoinCode(
  existingCodes: Set<string> | string[]
): Promise<string> {
  const existing =
    existingCodes instanceof Set
      ? existingCodes
      : new Set(existingCodes)

  let code: string
  let attempts = 0
  const maxAttempts = 100

  do {
    code = randomCode(6)
    attempts++
    if (attempts > maxAttempts) {
      throw new Error(
        "Failed to generate unique class join code after maximum attempts"
      )
    }
  } while (existing.has(code))

  return code
}

/**
 * Generate a unique 6-character game session code.
 * Checks for uniqueness against existing codes in the database.
 */
export async function generateSessionCode(
  existingCodes: Set<string> | string[]
): Promise<string> {
  const existing =
    existingCodes instanceof Set
      ? existingCodes
      : new Set(existingCodes)

  let code: string
  let attempts = 0
  const maxAttempts = 100

  do {
    code = randomCode(6)
    attempts++
    if (attempts > maxAttempts) {
      throw new Error(
        "Failed to generate unique session code after maximum attempts"
      )
    }
  } while (existing.has(code))

  return code
}

/**
 * Generate a simple code without uniqueness checking.
 * Useful when the caller handles uniqueness themselves.
 */
export function generateCode(length: number = 6): string {
  return randomCode(length)
}
