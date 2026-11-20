export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger'
  type = 'button',
  className = '',
  disabled = false,
  onClick,
  style,
  ...props
}) {
  let variantClass = '';
  if (variant === 'secondary') {
    variantClass = 'b2';
  } else if (variant === 'danger') {
    variantClass = 'b3';
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${variantClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}
