export default function Banner({
  children,
  variant = 'nt', // 'ok' | 'wn' | 'bd' | 'nt'
  action,
  className = '',
  style,
  ...props
}) {
  return (
    <div className={`banner ${variant} ${className}`.trim()} style={style} {...props}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}
