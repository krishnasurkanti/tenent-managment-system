import { cn } from "@/utils/cn";

/*
 * DataTable — desktop-optimised table (rebuild).
 * Generic column/row model rendered with the shared .ui-table styles inside a
 * horizontally-scrollable wrapper (the wrapper is the only element allowed to
 * scroll horizontally, per the shell rules).
 */

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyLabel = "No data",
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("ui-table-wrap", className)}>
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align ?? "left" }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-[color:var(--fg-tertiary)]">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={getRowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align ?? "left" }} className={c.className}>
                    {c.render(row)}
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
