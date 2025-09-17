import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import { useLogs } from '../context/LogsContext';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  pageSize, 
  onPageSizeChange, 
  totalItems,
  hasNext,
  hasPrevious 
}) => {
  const { addLog } = useLogs();
  
  const handlePageChange = (newPage) => {
    addLog({
      type: 'info',
      message: `Navigating to page ${newPage}`,
      details: { fromPage: currentPage, toPage: newPage, totalPages }
    });
    onPageChange(newPage);
  };
  
  const handlePageSizeChange = (newPageSize) => {
    addLog({
      type: 'info',
      message: `Page size changed to ${newPageSize}`,
      details: { fromSize: pageSize, toSize: newPageSize, totalItems }
    });
    onPageSizeChange(newPageSize);
  };

  // Calculate the range of items being shown
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage, endPage;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if less than max visible pages
      startPage = 1;
      endPage = totalPages;
    } else {
      // Calculate start and end pages
      if (currentPage <= Math.ceil(maxVisiblePages / 2)) {
        startPage = 1;
        endPage = maxVisiblePages;
      } else if (currentPage + Math.floor(maxVisiblePages / 2) >= totalPages) {
        startPage = totalPages - maxVisiblePages + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - Math.floor(maxVisiblePages / 2);
        endPage = currentPage + Math.floor(maxVisiblePages / 2);
      }
    }

    // Generate page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  // Page size options
  const pageSizeOptions = [10, 20, 50, 100];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-6 py-4">
      {/* Page size selector */}
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-700">Show</span>
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          className="text-sm border-2 border-indigo-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-indigo-300"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-sm font-medium text-gray-700">per page</span>
      </div>

      {/* Page info */}
      <div className="text-sm text-gray-600 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-xl border border-indigo-200/50">
        Showing <span className="font-semibold text-indigo-700">{startItem}</span> to{' '}
        <span className="font-semibold text-indigo-700">{endItem}</span> of{' '}
        <span className="font-semibold text-indigo-700">{totalItems}</span> results
      </div>

      {/* Page navigation */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-xl transition-all duration-200 ${
            currentPage === 1 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-indigo-600 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-0.5'
          }`}
          aria-label="First page"
        >
          <FiChevronsLeft size={18} />
        </button>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!hasPrevious}
          className={`p-2 rounded-xl transition-all duration-200 ${
            !hasPrevious 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-indigo-600 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-0.5'
          }`}
          aria-label="Previous page"
        >
          <FiChevronLeft size={18} />
        </button>

        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 ${
              currentPage === page
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!hasNext}
          className={`p-2 rounded-xl transition-all duration-200 ${
            !hasNext 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-indigo-600 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-0.5'
          }`}
          aria-label="Next page"
        >
          <FiChevronRight size={18} />
        </button>
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-xl transition-all duration-200 ${
            currentPage === totalPages 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-indigo-600 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-0.5'
          }`}
          aria-label="Last page"
        >
          <FiChevronsRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
