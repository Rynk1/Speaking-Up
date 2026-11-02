import React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { EmptyState } from './Feedback';

export interface DataTableProps {
  columns: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  skeleton?: React.ReactNode;
  empty?: React.ReactNode;
  isEmpty?: boolean;
  className?: string;
}

/**
 * Table shell with a sticky, styled header and consistent empty/loading
 * handling so every admin table behaves the same way.
 */
export const DataTable: React.FC<DataTableProps> = ({
  columns,
  children,
  loading = false,
  skeleton,
  empty,
  isEmpty = false,
  className = ''
}) => (
  <div className={`bg-slate-950/60 border border-slate-800 rounded-xl overflow-x-auto ${className}`}>
    <table className="w-full text-left text-xs text-slate-300 border-collapse">
      <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800 sticky top-0 z-10">
        <tr>{columns}</tr>
      </thead>
      {loading && skeleton ? skeleton : children}
    </table>
    {!loading && isEmpty && (
      <div className="border-t border-slate-800">
        {empty || <EmptyState title="Nothing to show" />}
      </div>
    )}
  </div>
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }> = ({
  align = 'left',
  className = '',
  children,
  ...rest
}) => (
  <th
    scope="col"
    className={`px-3 py-2.5 font-bold ${
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    } ${className}`}
    {...rest}
  >
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }> = ({
  align = 'left',
  className = '',
  children,
  ...rest
}) => (
  <td
    className={`px-3 py-2.5 ${
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    } ${className}`}
    {...rest}
  >
    {children}
  </td>
);

export interface SortHeaderProps {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'right' | 'center';
}

export const SortHeader: React.FC<SortHeaderProps> = ({ label, active, direction, onClick, align = 'left' }) => (
  <Th align={align}>
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 hover:text-white transition-colors uppercase"
      aria-label={`Sort by ${label}`}
    >
      {label}
      {active ? (
        direction === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowDown className="w-3 h-3" />
        )
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  </Th>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', children, ...rest }) => (
  <tr className={`hover:bg-slate-900/50 transition-colors ${className}`} {...rest}>
    {children}
  </tr>
);
