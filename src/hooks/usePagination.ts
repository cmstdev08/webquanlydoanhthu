import { useState, useEffect, useCallback } from 'react';

interface UsePaginationProps {
  total: number;
  pageSize?: number;
  initialPage?: number;
}

export function usePagination({ total, pageSize = 20, initialPage = 1 }: UsePaginationProps) {
  const [page, setPage] = useState(initialPage);
  const [size, setSize] = useState(pageSize);
  
  const totalPages = Math.max(1, Math.ceil(total / size));

  // Reset page when total or size changes
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [total, size, page, totalPages]);

  const nextPage = useCallback(() => setPage((p) => Math.min(p + 1, totalPages)), [totalPages]);
  const prevPage = useCallback(() => setPage((p) => Math.max(p - 1, 1)), []);
  const goToPage = useCallback((p: number) => setPage(Math.min(Math.max(p, 1), totalPages)), [totalPages]);

  const offset = (page - 1) * size;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + size, total);

  return {
    page,
    pageSize: size,
    totalPages,
    total,
    offset,
    from,
    to,
    nextPage,
    prevPage,
    goToPage,
    setPageSize: setSize,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
