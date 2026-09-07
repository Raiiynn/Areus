import bcrypt from 'bcryptjs'

/**
 * Password hashing.
 *
 * Isolated deliberately (ADR-0001): bcryptjs is a pure-JS implementation chosen
 * for build reliability on Windows, not for being the strongest option. When
 * this project deploys to Linux, argon2id should replace it — and this file is
 * the only place that has to change.
 */

/**
 * Work factor. 12 keeps a single hash around 250ms on typical hardware, which
 * is slow enough to make offline cracking expensive and fast enough that login
 * does not feel broken.
 */
const COST = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * Burn roughly the same time a real verification costs.
 *
 * Login must take the same time whether or not the account exists, otherwise
 * response timing tells an attacker which usernames are registered. Call this
 * on the "no such user" branch.
 */
export async function fakeVerifyPassword(): Promise<void> {
  // A pre-computed hash of a value nothing can match.
  await bcrypt.compare(
    'timing-equalisation',
    '$2a$12$Ux8Q0kZ9wZ1lY7dQ2hK3ge3zJ0m1cR4tV5nB6xM7pL8sD9fG0hJ2i',
  )
}
