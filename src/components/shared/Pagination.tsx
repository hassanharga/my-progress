import { Fragment, useMemo, type FC } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type Props = {
  currentPage: number;
  totalPages: number;
  onChangePage: (page: number) => void;
};

const visiblePages = 3; // Number of page buttons to show around the current page

const PaginationDemo: FC<Props> = ({ onChangePage, currentPage, totalPages }) => {
  const pages = useMemo(() => {
    const pages = [];
    const startPage = Math.max(2, currentPage - Math.floor(visiblePages / 2));
    const endPage = Math.min(totalPages - 1, currentPage + Math.floor(visiblePages / 2));

    if (startPage > 2) pages.push('...');
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    if (endPage < totalPages - 1) pages.push('...');
    return pages;
  }, [currentPage, totalPages]);

  return (
    <Pagination>
      <PaginationContent>
        {/* previous page */}
        <PaginationItem className={`cursor-pointer ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}>
          <PaginationPrevious
            onClick={() => {
              if (currentPage <= 1) return;
              onChangePage(currentPage - 1);
            }}
          />
        </PaginationItem>
        {/* first page */}
        <PaginationItem className={`cursor-pointer ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}>
          <PaginationLink
            isActive={currentPage === 1}
            onClick={() => {
              if (currentPage <= 1) return;
              onChangePage(currentPage - 1);
            }}
          >
            1
          </PaginationLink>
        </PaginationItem>

        {/* Dots and Page Numbers */}
        {pages.map((page, index) => (
          <Fragment key={index}>
            {page === '...' ? (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem
                className={`cursor-pointer ${currentPage === page ? 'pointer-events-none opacity-50' : ''}`}
              >
                <PaginationLink
                  isActive={currentPage === page}
                  onClick={() => {
                    onChangePage(page as number);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )}
          </Fragment>
        ))}

        {/* Last Page */}
        {totalPages > 1 && (
          <PaginationItem
            className={`cursor-pointer ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
          >
            <PaginationLink
              isActive={currentPage === totalPages}
              onClick={() => {
                if (currentPage >= totalPages) return;
                onChangePage(totalPages);
              }}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}

        {/* next page */}
        <PaginationItem
          className={`cursor-pointer ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
        >
          <PaginationNext
            onClick={() => {
              if (currentPage >= totalPages) return;
              onChangePage(currentPage + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationDemo;
