interface LogoProps {
  size?: number
}

export default function Logo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="6" fill="#FF6B35" />
      <path d="M10 22V10l6 8 6-8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="10" r="1.5" fill="white" />
    </svg>
  )
}