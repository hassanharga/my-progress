/* eslint-disable react/no-array-index-key */

import { type JSX } from 'react';

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import PaginationDemo from './Pagination';

type Props<T> = {
  captionLabel?: string;
  headers: string[];
  rows: T[];
  currentPage: number;
  totalPages: number;
  onChangePage: (page: number) => void;
};

const TableData = <T extends object>({
  captionLabel,
  headers,
  rows,
  currentPage,
  onChangePage,
  totalPages,
}: Props<T>): JSX.Element => {
  return (
    <div className="self-stretch flex flex-col items-center gap-3">
      <Table>
        <TableCaption className="caption-top">{captionLabel}</TableCaption>
        <TableHeader>
          <TableRow>{headers?.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows?.map((row, rowIdx) => (
            <TableRow key={rowIdx}>
              {Object.values(row).map((value, cellIdx) => (
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
