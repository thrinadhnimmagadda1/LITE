import React, { useState } from 'react';

const SearchForm = ({ onSearch, initialQuery = '', initialKeywords = '', compact = false }) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [optionalKeywords, setOptionalKeywords] = useState(initialKeywords);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch({
        query: searchQuery.trim(),
        keywords: optionalKeywords.trim()
      });
    }
  };

  return (
    <div className={`w-full ${compact ? '' : 'max-w-4xl mx-auto'}`}>
      <form onSubmit={handleSubmit} className={`${compact ? 'flex flex-wrap gap-3 items-end' : 'space-y-4'}`}>
        <div className={`${compact ? 'flex-1 min-w-[200px]' : 'w-full space-y-2'}`}>
          <label htmlFor="search" className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${compact ? 'mb-1' : ''}`}>
            {compact ? 'Search' : 'Search terms (required)'}
          </label>
          <input
            id="search"
            name="search"
            type="text"
            required
            className="appearance-none rounded-lg relative block w-full px-4 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-base"
            placeholder="Enter search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={`${compact ? 'flex-1 min-w-[200px]' : 'w-full space-y-2'}`}>
          <label htmlFor="optional-keywords" className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${compact ? 'mb-1' : ''}`}>
            {compact ? 'Filters' : 'Optional keywords (comma-separated)'}
          </label>
          <input
            id="optional-keywords"
            name="optional-keywords"
            type="text"
            className="appearance-none rounded-lg relative block w-full px-4 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-base"
            placeholder="Enter optional keywords..."
            value={optionalKeywords}
            onChange={(e) => setOptionalKeywords(e.target.value)}
          />
          {!compact && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Add specific terms to refine your search (optional)
            </p>
          )}
        </div>

        <div className={compact ? 'mb-1' : ''}>
          <button
            type="submit"
            className={`w-full flex justify-center py-3 px-4 border border-transparent font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${compact ? 'py-2 px-4 text-sm' : 'text-lg'}`}
          >
            {compact ? 'Search' : 'Search Papers'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
