export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'Belum ada data untuk ditampilkan.',
  showRowNumber = true,
  className = '',
  style,
}) {
  const totalColumns = (showRowNumber ? 1 : 0) + columns.length;

  return (
    <div className={`card sc ${className}`.trim()} style={style}>
      <table>
        <thead>
          <tr>
            {showRowNumber && (
              <th style={{ width: '48px', textAlign: 'center' }}>No.</th>
            )}
            {columns.map((col, idx) => {
              const isRight = col.align === 'right';
              return (
                <th
                  key={col.key || idx}
                  className={isRight ? 'r' : ''}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.title}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={totalColumns}
                style={{ textAlign: 'center', padding: '28px', color: '#5E6070' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const rowKey = row[keyField] ?? rowIdx;
              return (
                <tr key={rowKey}>
                  {showRowNumber && (
                    <td style={{ textAlign: 'center', color: '#5E6070', width: '48px' }}>
                      {rowIdx + 1}
                    </td>
                  )}
                  {columns.map((col, colIdx) => {
                    const isRight = col.align === 'right';
                    const cellVal = row[col.key];
                    return (
                      <td key={col.key || colIdx} className={isRight ? 'r' : ''}>
                        {col.render ? col.render(cellVal, row, rowIdx) : (cellVal ?? '-')}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
