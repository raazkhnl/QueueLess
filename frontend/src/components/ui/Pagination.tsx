interface Props {
  page: number;
  pages: number;
  total: number;
  showing: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pages, total, showing, onPageChange }: Props) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700" role="navigation" aria-label="Pagination">
      <span className="text-sm text-slate-500">Showing {showing} of {total}</span>
      <div className="flex gap-1">
        <button onClick={() => onPageChange(1)} disabled={page === 1} className="btn-secondary btn-sm" aria-label="First page">«</button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="btn-secondary btn-sm" aria-label="Previous page">‹</button>
        <span className="btn-sm text-slate-500 select-none">{page} / {pages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= pages} className="btn-secondary btn-sm" aria-label="Next page">›</button>
        <button onClick={() => onPageChange(pages)} disabled={page >= pages} className="btn-secondary btn-sm" aria-label="Last page">»</button>
      </div>
    </div>
  );
}
