interface TreeMarkProps {
  className?: string
  title?: string
}

/**
 * Brand mark: a stylised tree used in the header, empty states and as the
 * canvas watermark.
 */
export function TreeMark({ className = '', title }: TreeMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <path
        d="M24 44V26"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M24 32l-7-6M24 28l7-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="13" r="8" fill="currentColor" opacity="0.28" />
      <circle cx="14" cy="21" r="6.5" fill="currentColor" opacity="0.22" />
      <circle cx="34" cy="21" r="6.5" fill="currentColor" opacity="0.22" />
      <circle cx="24" cy="13" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="14" cy="21" r="6.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="34" cy="21" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
