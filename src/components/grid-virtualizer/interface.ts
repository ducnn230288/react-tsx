import type { Column, ColumnDef, ColumnPinningState, FilterFn, FilterFns } from '@tanstack/react-table';
import type { CSSProperties, MutableRefObject, UIEventHandler } from 'react';

interface Props<TData> {
  onScroll?: UIEventHandler<HTMLDivElement>;
  widthCell?: number;
  heightCell?: number;
  data: TData[];
  columns: ColumnDef<TData>[];
  firstItem?: any;
  columnPinning?: ColumnPinningState;
  isExpanded?: boolean;
  isResizing?: boolean;
  onExpand?: (row: any) => void;
  isPagination?: boolean;
  paginationDescription?: (from: number, to: number, total: number) => string;
  isFilter?: boolean;
  filterGlobal?: FilterFn<TData>;
  onRow?: (data: any) => { onDoubleClick?: () => void; onClick?: () => void };
  rowSelection?: {
    onChange?: (selectedRows: any[]) => void;
    columnWidth?: number;
  };
  pageSize?: number;
  maxSize?: number;
  style?: CSSProperties;
  className?: string;
  isVirtualized?: boolean;
  keyId?: string;
  currentId?: string;
  onChange?: (state: any) => void;
}
export default Props;
export interface PropsFilter {
  column: Column<any>;
  refFilterTypeCurrent: MutableRefObject<{ [selector: string]: keyof FilterFns }>;
}
