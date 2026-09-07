/**
 * Joins class names, dropping falsy values.
 *
 * Deliberately not clsx + tailwind-merge: the Tailwind theme in this project
 * replaces the default palette rather than extending it, so the conflicting
 * -utility problem tailwind-merge solves barely arises. One fewer dependency
 * (MASTER_PROMPT: no dependency for what a few lines already do).
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
