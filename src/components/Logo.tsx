interface LogoProps {
  size?: number
}

export default function Logo({ size = 32 }: LogoProps) {
  return (
    <img
      src="/meeseeker-logo.png"
      alt="Meeseeker"
      width={size}
      height={size}
      style={{ borderRadius: 6, objectFit: 'cover' }}
    />
  )
}