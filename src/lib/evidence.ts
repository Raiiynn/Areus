import 'server-only'

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  ALLOWED_EVIDENCE_TYPES,
  MAX_EVIDENCE_BYTES,
  type AllowedEvidenceType,
} from '@/domain/constants'

/**
 * Screenshot evidence storage (FULL_BUILD §52).
 *
 * Files are written outside the web root — `var/evidence/`, not `public/` — so
 * nothing is publicly listable or guessable. They are served only through an
 * authorized route handler.
 *
 * The client's declared MIME type is never trusted (§1568). The real type comes
 * from the file's magic bytes.
 */

const EVIDENCE_ROOT = path.join(process.cwd(), 'var', 'evidence')

export class EvidenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EvidenceError'
  }
}

/**
 * Identify an image by its leading bytes.
 * Returns null for anything that is not an allowed image format.
 */
export function detectImageType(buffer: Buffer): AllowedEvidenceType | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png'
  }

  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpeg'
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }

  return null
}

export interface StoredEvidence {
  storagePath: string
  mimeType: string
  byteSize: number
  detectedType: string
  sha256: string
}

/**
 * Validate and store an uploaded screenshot.
 *
 * Order matters: size is checked before the buffer is read into memory, and the
 * type is checked before anything is written to disk.
 */
export async function storeEvidence(file: File): Promise<StoredEvidence> {
  if (file.size === 0) {
    throw new EvidenceError('Attach a screenshot as evidence.')
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new EvidenceError(
      `Screenshot must be ${MAX_EVIDENCE_BYTES / (1024 * 1024)}MB or smaller.`,
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const detected = detectImageType(buffer)

  if (!detected || !ALLOWED_EVIDENCE_TYPES.includes(detected)) {
    throw new EvidenceError(
      'Evidence must be a PNG, JPEG or WebP image. The file you sent is not one.',
    )
  }

  const sha256 = createHash('sha256').update(buffer).digest('hex')

  // Content-addressed: identical screenshots collapse to one file on disk, and
  // the filename carries no user-controlled text, so path traversal via a
  // crafted filename is impossible.
  const filename = `${sha256}.${detected}`
  const absolutePath = path.join(EVIDENCE_ROOT, filename)

  await mkdir(EVIDENCE_ROOT, { recursive: true })
  await writeFile(absolutePath, buffer)

  return {
    storagePath: filename,
    mimeType: `image/${detected}`,
    byteSize: buffer.byteLength,
    detectedType: detected,
    sha256,
  }
}

/**
 * Read a stored evidence file.
 *
 * `storagePath` comes from the database, never from a request, but it is still
 * validated against the expected shape and re-joined under the evidence root so
 * a corrupted row cannot escape the directory.
 */
export async function readEvidence(storagePath: string): Promise<Buffer> {
  if (!/^[a-f0-9]{64}\.(png|jpeg|webp)$/.test(storagePath)) {
    throw new EvidenceError('Malformed evidence reference.')
  }

  const absolutePath = path.join(EVIDENCE_ROOT, storagePath)
  const resolved = path.resolve(absolutePath)

  if (!resolved.startsWith(path.resolve(EVIDENCE_ROOT))) {
    throw new EvidenceError('Evidence path escapes the storage root.')
  }

  return readFile(resolved)
}
