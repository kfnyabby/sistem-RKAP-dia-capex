export default function Chip({
  children,
  variant = 'nt', // 'ok' | 'wn' | 'bd' | 'nt'
  className = '',
  style,
  ...props
}) {
  return (
    <span className={`chip ${variant} ${className}`.trim()} style={style} {...props}>
      {children}
    </span>
  );
}
