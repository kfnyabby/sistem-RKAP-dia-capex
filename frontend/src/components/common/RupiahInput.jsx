import { useRef, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';

export function formatRupiahDisplay(val) {
  if (val === null || val === undefined || val === '') return '';
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  const clean = digits.replace(/^0+(?=\d)/, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseRupiahRaw(val) {
  if (val === null || val === undefined) return '';
  const digits = String(val).replace(/\D/g, '');
  return digits.replace(/^0+(?=\d)/, '');
}

export default function RupiahInput({
  id,
  name,
  value,
  onChange,
  onKeyDown,
  placeholder = '0',
  disabled = false,
  readOnly = false,
  required = false,
  className,
  style,
  autoFocus = false,
  ...rest
}) {
  const inputRef = useRef(null);
  const cursorInfoRef = useRef(null);

  const displayValue = formatRupiahDisplay(value);

  const handleChange = (e) => {
    const inputEl = e.target;
    const currentPos = inputEl.selectionStart;
    const rawVal = inputEl.value;

    // Hitung berapa digit angka yang ada sebelum posisi kursor saat ini
    const digitsBefore = rawVal.slice(0, currentPos).replace(/\D/g, '').length;

    // Bersihkan karakter non-digit dan leading zeros
    const cleanDigits = parseRupiahRaw(rawVal);
    const newFormatted = formatRupiahDisplay(cleanDigits);

    // Simpan informasi kursor agar dapat dipulihkan pasca re-render React
    cursorInfoRef.current = {
      digitsBefore,
      formattedLen: newFormatted.length,
      cleanDigits,
    };

    if (onChange) {
      onChange({
        ...e,
        target: {
          ...e.target,
          id: id || e.target.id,
          name: name || id || e.target.name,
          value: cleanDigits,
        },
      });
    }
  };

  const handleKeyDown = (e) => {
    // Tangani tombol Backspace jika posisi kursor tepat di belakang titik (.)
    if (e.key === 'Backspace') {
      const inputEl = e.target;
      const { selectionStart, selectionEnd, value: curVal } = inputEl;
      if (selectionStart === selectionEnd && selectionStart > 0) {
        if (curVal[selectionStart - 1] === '.') {
          e.preventDefault();
          // Hapus digit sebelum tanda titik tersebut
          const updated = curVal.slice(0, selectionStart - 2) + curVal.slice(selectionStart);
          const cleanDigits = parseRupiahRaw(updated);
          const newFormatted = formatRupiahDisplay(cleanDigits);

          cursorInfoRef.current = {
            digitsBefore: Math.max(0, curVal.slice(0, selectionStart - 2).replace(/\D/g, '').length),
            formattedLen: newFormatted.length,
            cleanDigits,
          };

          if (onChange) {
            onChange({
              ...e,
              target: {
                ...e.target,
                id: id || e.target.id,
                name: name || id || e.target.name,
                value: cleanDigits,
              },
            });
          }
          return;
        }
      }
    }

    if (onKeyDown) onKeyDown(e);
  };

  useLayoutEffect(() => {
    if (cursorInfoRef.current && inputRef.current) {
      const { digitsBefore } = cursorInfoRef.current;
      const currentVal = inputRef.current.value;

      let newPos = 0;
      let count = 0;

      for (let i = 0; i < currentVal.length; i++) {
        if (/\d/.test(currentVal[i])) {
          count++;
        }
        if (count === digitsBefore) {
          newPos = i + 1;
          break;
        }
      }

      if (digitsBefore === 0) {
        newPos = 0;
      } else if (count < digitsBefore) {
        newPos = currentVal.length;
      }

      inputRef.current.setSelectionRange(newPos, newPos);
      cursorInfoRef.current = null;
    }
  }, [displayValue]);

  return (
    <input
      ref={inputRef}
      id={id}
      name={name || id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      className={className}
      style={style}
      autoFocus={autoFocus}
      {...rest}
    />
  );
}

RupiahInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onKeyDown: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  autoFocus: PropTypes.bool,
};
