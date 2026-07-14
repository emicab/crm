"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  itemLabel = "ítems",
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const range = 1;
  const first = 1;
  const last = totalPages;
  const left = Math.max(first, page - range);
  const right = Math.min(last, page + range);

  if (left > first + 1) pages.push(first, 'left-ellipsis');
  else if (left === first + 1) pages.push(first);
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < last - 1) pages.push('right-ellipsis', last);
  else if (right === last - 1) pages.push(last);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border mt-4">
      <p className="text-sm text-foreground-muted whitespace-nowrap">
        {totalItems} {itemLabel} · Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1 flex-wrap justify-center">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={16} />
        </Button>
        {pages.map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="px-1 text-foreground-muted text-sm">...</span>
          ) : (
            <Button key={p} variant={p === page ? 'primary' : 'outline'} size="sm" onClick={() => onPageChange(p)} className="min-w-[32px]">{p}</Button>
          )
        )}
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
