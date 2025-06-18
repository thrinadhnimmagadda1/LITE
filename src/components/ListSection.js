import React from 'react';
import { useNavigate } from 'react-router-dom';

const ListSection = ({ items = [], onCategorySelect, onItemClick }) => {
  const navigate = useNavigate();

  const handleItemClick = (itemId) => {
    // Call the onItemClick handler if provided
    onItemClick?.(itemId);
    // Navigate to the item detail page
    navigate(`/item/${itemId}`);
  };
  return (
    <div className="space-y-6">
      {/* Search and Filter Section
      <div className="bg-white shadow overflow-hidden rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-1/2">
            <input
              type="text"
              placeholder="Search papers..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              onChange={(e) => onCategorySelect?.(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Filter by:</span>
            <select className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <option>All Categories</option>
              <option>Planning</option>
              <option>LLM Integration</option>
              <option>Benchmarking</option>
            </select>
          </div>
        </div>
      </div> */}

      {/* Papers List */}
      <div className="space-y-6">
        {items.map((item, index) => (
          <div 
            key={index} 
            className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-200"
            onClick={() => handleItemClick(item.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleItemClick(item.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="p-6">
              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h3>
                  <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                    {new Date(item.line2.replace('Date : ', '')).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600">
                  {item.line1}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {item.technologies?.map((tech, techIndex) => (
                    <span
                      key={techIndex}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-gray-600 line-clamp-2">
                  {item.line3}
                </p>

                <div className="flex justify-end">
                  <span className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Read more →
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
        <div className="flex flex-1 justify-between sm:hidden">
          <a href="#" className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Previous
          </a>
          <a href="#" className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Next
          </a>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">{Math.min(items.length, 10)}</span> of{' '}
              <span className="font-medium">{items.length}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <a
                href="#"
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
              >
                <span className="sr-only">Previous</span>
                &larr; Previous
              </a>
              <a
                href="#"
                aria-current="page"
                className="relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                1
              </a>
              <a
                href="#"
                className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
              >
                2
              </a>
              <a
                href="#"
                className="relative hidden items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 md:inline-flex"
              >
                3
              </a>
              <a
                href="#"
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
              >
                <span className="sr-only">Next</span>
                Next &rarr;
              </a>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListSection;
