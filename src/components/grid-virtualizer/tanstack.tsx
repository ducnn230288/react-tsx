import {
  flexRender,
  useReactTable,
  type Cell,
  type Column,
  type Header,
  type Table,
  type TableOptions,
} from '@tanstack/react-table';
import { defaultRangeExtractor, useVirtualizer, type Range, type VirtualItem } from '@tanstack/react-virtual';
import { Dropdown } from 'antd';
import classNames from 'classnames';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { EIcon } from '@/enums';
import { generateRangeNumber } from '@/utils';
import { CSvgIcon } from '../svg-icon';
import { Filter } from './filter';
import type Props from './interface';
import { CPagination } from './pagination';
import { generateOption, getPaddingLeft } from './util';

const Tanstack = <TData,>(
  {
    data,
    widthCell,
    maxSize = 1200,
    columns,
    columnPinning = {},
    isResizing,
    isExpanded,
    isPagination,
    isFilter,
    filterGlobal,
    rowSelection,
    keyId = 'id',
    firstItem,
    heightCell,
    pageSize,
    paginationDescription,
    onRow,
    className,
    style,
    onScroll,
    isVirtualized,
    currentId,
    onChange,
  }: Props<TData>,
  ref: Ref<Table<TData> | undefined>,
) => {
  const [state, setState] = useState<any>({
    globalFilter: '',
    columnFilters: [],
    sorting: [],
    columnVisibility: {},
    rowSelection: {},
    expanded: {},
    pagination: {
      pageIndex: 0,
      pageSize: pageSize ?? 0,
    },
    columnPinning,
  });

  const option: TableOptions<TData> = generateOption<TData>({
    data,
    widthCell,
    maxSize,
    columns,
    isResizing,
    isExpanded,
    isPagination,
    isFilter,
    filterGlobal,
    rowSelection,
    keyId,
    state,
    setState,
  });
  const table = useReactTable<any>(option);
  useImperativeHandle(ref, () => table);

  useEffect(() => {
    onChange?.(table);
  }, [state]);
  useEffect(() => {
    if (rowSelection?.onChange) {
      rowSelection.onChange(
        Object.keys(state.rowSelection)
          ?.filter(key => !!state.rowSelection[key])
          ?.map(id => loopSelection({ id, array: data })),
      );
    }
  }, [state.rowSelection]);
  const loopSelection = ({ id, array }) => {
    let data;
    array.forEach(element => {
      if (!data && element[keyId] === id) {
        data = element;
      } else if (!data && element.children) {
        data = loopSelection({ id, array: element.children });
      }
    });
    return data;
  };
  const refFilterTypeCurrent = useRef<any>({});

  /**
   * Virtualizes the rows in the grid component.
   *
   * @remarks
   * This virtualizer is responsible for rendering a subset of rows based on the visible area of the grid.
   *
   * @param count - The total number of rows in the grid.
   * @param getScrollElement - A function that returns the scroll element of the grid.
   * @param estimateSize - A function that estimates the size of each row.
   * @param overscan - The number of additional rows to render outside the visible area.
   *
   * @returns The virtualizer object for the rows in the grid.
   */
  const refParent = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    enabled: isVirtualized,
    count: table.getRowModel().rows?.length ?? 0,
    getScrollElement: () => refParent?.current,
    estimateSize: () => heightCell!,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? element => element?.getBoundingClientRect().height
        : undefined,
    overscan: 0,
  });
  /**
   * Retrieves the virtual items for the grid.
   *
   * @returns An array of virtual items for the grid.
   */
  const visibleColumns = table.getVisibleLeafColumns();
  /**
   * Initializes the column virtualizer for the grid.
   *
   * @param {Object} options - The options for the column virtualizer.
   * @param {boolean} options.horizontal - Specifies if the virtualizer is horizontal.
   * @param {number} options.count - The number of columns in the virtualizer.
   * @param {Function} options.getScrollElement - A function that returns the scroll element.
   * @param {Function} options.estimateSize - A function that estimates the size of a column.
   * @param {number} options.overscan - The number of additional columns to render outside the visible area.
   */
  const columnVirtualizer = useVirtualizer({
    enabled: isVirtualized,
    horizontal: true,
    count: visibleColumns.length,
    getScrollElement: () => refParent?.current,
    estimateSize: index => visibleColumns[index].getSize(), //estimate width of each column for accurate scrollbar dragging
    overscan: 0,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? element => element?.getBoundingClientRect().width
        : undefined,
    rangeExtractor: (range: Range) => {
      const { columnPinning } = state;
      return [
        ...generateRangeNumber({
          start: columnPinning.left?.length ? 0 : undefined,
          end: columnPinning.left?.length - 1,
        }),
        ...defaultRangeExtractor(range),
        ...generateRangeNumber({
          start: table.getVisibleLeafColumns().length - (columnPinning.right ?? []).length,
          end: columnPinning.right?.length ? table.getVisibleLeafColumns().length - 1 : undefined,
        }),
      ]
        .filter((value, index, array) => array.indexOf(value) === index)
        .sort((a, b) => a - b);
    },
  });
  /**
   * Retrieves the virtualized columns for the grid.
   *
   * @returns An array of virtualized column items.
   */
  const virtualColumns = columnVirtualizer.getVirtualItems();

  /**
   * Instead of calling `column.getSize()` on every render for every header
   * and especially every data cell (very expensive),
   * we will calculate all column sizes at once at the root table level in a useMemo
   * and pass the column sizes down as CSS variables to the <table> element.
   */
  const columnSizeVars = () => {
    const headers = table.getFlatHeaders();
    const colSizes: { [key: string]: number | string } = {
      width: table.getTotalSize() + 'px',
    };
    for (const header of headers) {
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  };

  //These are the important styles to make sticky column pinning work!
  //Apply styles like this using your CSS strategy of choice with this kind of logic to head cells, data cells, footer cells, etc.
  //View the index.css file for more needed styles such as border-collapse: separate
  const getCommonPinningStyles = (column: Column<any>): CSSProperties => {
    if (!column) return {};
    const isPinned = column.getIsPinned();
    const isLastLeftPinnedColumn = isPinned === 'left' && column.getIsLastColumn('left');
    const isFirstRightPinnedColumn = isPinned === 'right' && column.getIsFirstColumn('right');
    const styleRight = isFirstRightPinnedColumn ? '4px 0 4px -4px gray inset' : undefined;
    return {
      boxShadow: isLastLeftPinnedColumn ? '-4px 0 4px -4px gray inset' : styleRight,
      left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
      right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
      position: isPinned ? 'sticky' : 'relative',
      zIndex: isPinned ? 1 : 0,
      paddingRight: column?.columnDef?.meta?.filter ? '1.5rem' : undefined,
    };
  };

  const { t } = useTranslation('locale', { keyPrefix: 'Components' });
  const renderDropdownItem = (column: Column<any>, vc: VirtualItem | Header<TData, unknown>) => {
    const item: { label: string; key: string; onClick: () => void }[] = [];
    const isHasOnlyOneColumn = table.getVisibleLeafColumns().length === 1;
    if (!isHasOnlyOneColumn) {
      item.push({
        label: t('Hide'),
        key: 'hide',
        onClick: () => {
          column.toggleVisibility(false);
          columnVirtualizer.scrollToOffset((columnVirtualizer.scrollOffset ?? 0) + 1);
        },
      });

      if (column?.getIsPinned() !== 'left')
        item.push({
          label: t('PinLeft'),
          key: 'pin-left',
          onClick: () => column.pin('left'),
        });
      if (column?.getIsPinned() !== 'right')
        item.push({
          label: t('PinRight'),
          key: 'pin-right',
          onClick: () => {
            column.pin('right');
            columnVirtualizer.scrollToOffset((columnVirtualizer.scrollOffset ?? 0) + 1);
          },
        });
    }
    if (column?.getSize() !== column?.columnDef?.size)
      item.push({
        label: t('ResetSize'),
        key: 'reset-size',
        onClick: () => {
          column?.resetSize();
          setTimeout(() => {
            columnVirtualizer.resizeItem(vc as any, column.getSize());
          }, 200);
        },
      });
    if (column?.getIsPinned())
      item.push({
        label: t('ResetPin'),
        key: 'reset-pin',
        onClick: () => column.pin(false),
      });
    return item;
  };

  const refHeaderGroups = useRef(table.getHeaderGroups());
  useEffect(() => {
    table.setOptions({ ...table.options, columns, data });
    if (table.options.columns !== columns) {
      refHeaderGroups.current = table.getHeaderGroups();
    }
  }, [columns, data]);

  const refResize = useRef<any>();
  const refTimeOut = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (refResize.current?.isResizing) {
      clearTimeout(refTimeOut.current);
      refTimeOut.current = setTimeout(() => {
        columnVirtualizer.resizeItem(refResize.current.vc, refResize.current.header.column.getSize());
      }, 200);
    }
  }, [refResize]);

  const renderArrowVisibility = ({ vc, index, right = false }) => {
    let indexVisibility = 0;
    const visibility = refHeaderGroups.current.map(headerGroup =>
      headerGroup.headers
        .map((header, index) => {
          if (state.columnVisibility[header.id] === false) {
            indexVisibility += 1;
            return {
              id: header.id,
              index: index - (indexVisibility - 1),
            };
          }
          return null;
        })
        .filter((item: any) => item),
    );
    const arrowLeft: any = visibility[index].find((item: any) => item.index === vc.index);
    const arrowRight: any = visibility[index].find((item: any) => item.index === vc.index + 1);

    return (
      ((!!arrowLeft && !right) || (!!arrowRight && right)) && (
        <button
          onClick={() =>
            table.setColumnVisibility({
              ...state.columnVisibility,
              [arrowLeft?.id || arrowRight?.id]: true,
            })
          }
          className={classNames('absolute top-1/2 h-2 -translate-y-1/2 transform cursor-zoom-in', {
            'left-0': arrowLeft && !right,
            'right-0.5': arrowRight && right,
          })}
        >
          <CSvgIcon name={EIcon.Arrow} size={8} className={classNames({ 'rotate-180': arrowLeft && !right })} />
        </button>
      )
    );
  };

  const renderHeader = ({ vc, headerGroup, index }: any) => {
    if (!vc) return null;
    const header = headerGroup.headers[vc.index];

    if (header) {
      refResize.current = {
        isResizing: header.column.getIsResizing(),
        header,
        vc,
      };
    }

    return (
      header?.id && (
        <Dropdown
          key={header?.id}
          menu={{ items: renderDropdownItem(header?.column, vc) }}
          trigger={header?.column?.columnDef?.meta?.isHiddenHeader ? [] : ['contextMenu']}
        >
          <th
            style={{
              ...getCommonPinningStyles(header?.column),
              width: `calc(var(--header-${header?.id}-size) * 1px)`,
            }}
            className={classNames({
              'has-sorter': header?.column?.getCanSort(),
              'has-filter': header?.column?.getCanFilter(),
            })}
            aria-label={header?.column?.columnDef.header?.toString()}
          >
            {renderArrowVisibility({ vc, index })}
            <button
              type='button'
              className={classNames('flex w-full items-center justify-between', {
                'cursor-default': !header?.column?.columnDef?.meta?.sorter || !header?.column?.getCanSort(),
                hidden: header?.column?.columnDef?.meta?.isHiddenHeader,
              })}
              onClick={header?.column?.columnDef?.meta?.sorter ? header?.column?.getToggleSortingHandler() : () => {}}
            >
              {!header?.isPlaceholder && flexRender(header?.column?.columnDef.header, header?.getContext())}
              {{
                asc: <CSvgIcon name={EIcon.Sort} size={10} className='sort rotate-180' />,
                desc: <CSvgIcon name={EIcon.Sort} size={10} className='sort' />,
              }[header?.column?.getIsSorted() as string] ?? null}
            </button>
            <Filter column={header.column} refFilterTypeCurrent={refFilterTypeCurrent} />

            {!header?.column?.columnDef?.meta?.isHiddenHeader && isResizing && (
              <button
                type='button'
                onDoubleClick={() => header?.column?.resetSize()}
                onMouseDown={header?.getResizeHandler()}
                onTouchStart={header?.getResizeHandler()}
                className={classNames('resizer', { resizing: header?.column?.getIsResizing() })}
              />
            )}
            {renderArrowVisibility({ vc, index, right: true })}
          </th>
        </Dropdown>
      )
    );
  };
  const rowMeasureElement = el => {
    if (!el || !isVirtualized) return;
    rowVirtualizer.measureElement(el);
    return undefined;
  };
  const columnMeasureElement = el => {
    if (!el || !isVirtualized) return;
    columnVirtualizer.measureElement(el);
    return undefined;
  };

  const refVirtualPaddingLeft = useRef(0);
  refVirtualPaddingLeft.current = getPaddingLeft({
    old: refVirtualPaddingLeft.current,
    virtualColumns,
    pinLeft: state.columnPinning.left,
  });

  const renderBody = virtualRow => {
    const row = isVirtualized ? table.getRowModel().rows[virtualRow.index] : virtualRow;
    const visibleCells = row.getVisibleCells();

    return (
      <tr
        className={classNames({
          children: row.getParentRow(),
          'bg-warning-content': currentId && row.original[keyId] === currentId,
          'cursor-pointer': !!onRow,
        })}
        key={row.id}
        ref={rowMeasureElement}
        data-index={virtualRow.index}
        style={{
          transform: isVirtualized ? `translateY(${virtualRow.start}px)` : '', //this should always be a `style` as it changes on scroll
        }}
        onClick={() => !!onRow && onRow(row.original).onClick?.()}
        onDoubleClick={() => !!onRow && onRow(row.original).onDoubleClick?.()}
      >
        {isVirtualized && refVirtualPaddingLeft.current ? (
          <td style={{ width: refVirtualPaddingLeft.current + 'px' }} />
        ) : null}
        {(isVirtualized ? virtualColumns : visibleCells).map(vc => {
          if (!vc) return null;
          const cell: Cell<any, any> = isVirtualized ? visibleCells[vc.index] : vc;
          const style = cell?.column?.columnDef?.meta?.cellStyle
            ? cell?.column?.columnDef?.meta?.cellStyle({ row, cell })
            : {};
          const attributes = cell?.column?.columnDef?.meta?.onCell
            ? cell?.column?.columnDef?.meta?.onCell(row.original)
            : {};
          if (cell?.column?.columnDef?.meta?.align) style.textAlign = cell?.column?.columnDef?.meta?.align;
          return (
            cell?.column?.id && (
              <td
                ref={columnMeasureElement}
                key={cell?.id}
                data-index={vc.index}
                className={classNames('line-clamp-1', attributes?.className)}
                style={{
                  ...getCommonPinningStyles(cell?.column),
                  width: `calc(var(--col-${cell?.column?.id}-size) * 1px)`,
                  height: heightCell,
                  ...(attributes.style ?? {}),
                }}
              >
                <div style={style}>
                  {flexRender(cell?.column?.columnDef?.cell, cell?.getContext()) ?? cell?.getValue()}
                </div>
              </td>
            )
          );
        })}
      </tr>
    );
  };

  return (
    <>
      <div ref={refParent} onScroll={onScroll} className={classNames('scrollbar', className)} style={style}>
        {firstItem}
        <table className={classNames('c-virtual-scroll', { virtualized: isVirtualized })} style={columnSizeVars()}>
          <thead>
            {table.getHeaderGroups().map((headerGroup, index) => (
              <tr key={headerGroup.id}>
                {isVirtualized && refVirtualPaddingLeft.current ? (
                  <th style={{ width: refVirtualPaddingLeft.current + 'px' }} />
                ) : null}
                {(isVirtualized && index === table.getHeaderGroups().length - 1
                  ? virtualColumns
                  : headerGroup.headers
                ).map(vc => renderHeader({ vc, headerGroup, index }))}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              height: isVirtualized ? `${rowVirtualizer.getTotalSize() + 2}px` : 'auto', //tells scrollbar how big the table is
            }}
          >
            {(isVirtualized ? rowVirtualizer.getVirtualItems() : table.getRowModel().rows).map(renderBody)}
          </tbody>
        </table>
      </div>
      {isPagination && (
        <CPagination
          v-if='isPagination'
          total={table.getRowCount()}
          page={table.getState().pagination.pageIndex + 1}
          perPage={table.getState().pagination.pageSize}
          table={table}
          paginationDescription={paginationDescription}
        />
      )}
    </>
  );
};
export const ForwardedTanstack = forwardRef(Tanstack) as <TData>(
  props: Props<TData> & { ref: Ref<Table<TData> | undefined> },
) => ReturnType<typeof Tanstack>;
