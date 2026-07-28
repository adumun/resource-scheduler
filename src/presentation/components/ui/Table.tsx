import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  className?: string;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function Table<T>({ columns, rows, rowKey, onRowClick, emptyMessage = "No data." }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 font-medium text-slate-600 dark:text-slate-300 ${col.className ?? ""}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-2.5 text-slate-700 dark:text-slate-300 ${col.className ?? ""}`}>
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export type { Column, TableProps, ThHTMLAttributes, TdHTMLAttributes };
