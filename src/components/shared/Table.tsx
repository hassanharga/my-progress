/* eslint-disable react/no-array-index-key */

import { type JSX } from 'react';

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import PaginationDemo from './Pagination';

type Props<T> = {
  captionLabel?: string;
  headers: string[];
  rows: { data: T; values: (string | JSX.Element)[] }[];
  currentPage: number;
  totalPages: number;
  onChangePage: (page: number) => void;
  onRowClick: (data: T) => void;
};

const TableData = <T extends object>({
  captionLabel,
  headers,
  rows,
  currentPage,
  onChangePage,
  totalPages,
  onRowClick,
}: Props<T>): JSX.Element => {
  return (
    <div className="self-stretch flex flex-col items-center gap-3 p-4 pb-10">
      <Table>
        <TableCaption className="caption-top py-2">{captionLabel}</TableCaption>
        <TableHeader>
          <TableRow>{headers?.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows?.map((row, rowIdx) => (
            <TableRow
              key={rowIdx}
              className="cursor-pointer"
              onClick={() => {
                onRowClick(row.data);
              }}
            >
              {row.values.map((value, cellIdx) => (
                <TableCell key={cellIdx}>{value}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationDemo currentPage={currentPage} onChangePage={onChangePage} totalPages={totalPages} />
    </div>
  );
};

export default TableData;
