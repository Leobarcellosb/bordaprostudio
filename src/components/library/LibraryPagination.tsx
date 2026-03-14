import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";

interface LibraryPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const LibraryPagination = ({ page, totalPages, onPageChange }: LibraryPaginationProps) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(0);
    if (page > 2) pages.push("ellipsis");
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 3) pages.push("ellipsis");
    pages.push(totalPages - 1);
    return pages;
  };

  return (
    <Pagination className="mt-8">
      <PaginationContent>
        {page > 0 && (
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); onPageChange(page - 1); }} />
          </PaginationItem>
        )}
        {getVisiblePages().map((p, i) =>
          p === "ellipsis" ? (
            <PaginationItem key={`e${i}`}><PaginationEllipsis /></PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                href="#"
                isActive={p === page}
                onClick={(e) => { e.preventDefault(); onPageChange(p); }}
              >
                {p + 1}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        {page < totalPages - 1 && (
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); onPageChange(page + 1); }} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
};
