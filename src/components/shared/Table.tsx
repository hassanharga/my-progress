import { type JSX } from 'react';

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import Pagination from './Pagination';

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
    <div className="self-stretch flex flex-col items-center gap-3 p-4 pb-10 mt-4 w-full">
      <div className="w-full rounded-xl overflow-hidden border">
        <Table>
          <TableCaption className="caption-top py-2">{captionLabel}</TableCaption>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b hover:bg-muted/50">
              {headers?.map((header) => (
                <TableHead key={header} className="font-medium text-sm px-4 py-3">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* table data */}
            {rows?.length ? (
              rows?.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  className="cursor-pointer hover:bg-primary/5 transition-colors border-b last:border-b-0"
                  onClick={() => {
                    onRowClick(row.data);
                  }}
                >
                  {row.values.map((value, cellIdx) => (
                    <TableCell key={cellIdx} className="px-4 py-3">
                      {value}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="cursor-pointer">
                <TableCell className="text-center px-4 py-3" colSpan={headers?.length}>
                  No Data Found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination currentPage={currentPage} onChangePage={onChangePage} totalPages={totalPages} />
    </div>
  );
};

export default TableData;
