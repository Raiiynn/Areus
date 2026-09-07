import Image from 'next/image'

import { cn } from '@/lib/cn'

/**
 * Minecraft head render.
 *
 * Sourced from mc-heads.net, allow-listed in next.config.mjs. The container
 * reserves its exact box before the image loads, so a slow avatar cannot shift
 * the row it sits in.
 *
 * alt is intentionally empty: every usage sits beside the username as text, so
 * announcing the name twice would be noise for a screen-reader user.
 */
export function PlayerAvatar({
  username,
  size = 32,
  className,
}: {
  username: string
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-sm border border-line bg-surface-overlay',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/${size * 2}`}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
        unoptimized
      />
    </span>
  )
}
