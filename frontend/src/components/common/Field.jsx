export default function Field({
  label,
  error,
  children,
  className = '',
  style,
  htmlFor,
}) {
  return (
    <label htmlFor={htmlFor} className={className} style={style}>
      {label && <span>{label}</span>}
      {children}
      {error && (
        <span style={{ color: '#8A1F1B', fontSize: '11px', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </label>
  );
}
