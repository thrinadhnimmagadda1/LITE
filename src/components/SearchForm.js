import React, { useState, useEffect } from 'react';

const SearchForm = ({ onSearch, initialQuery = '', initialKeywords = '', compact = false }) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [optionalKeywords, setOptionalKeywords] = useState(initialKeywords);
  const [showOptionalKeywords, setShowOptionalKeywords] = useState(!!initialKeywords);

  // Update form when initial values change
  useEffect(() => {
    console.log('SearchForm: Initial values changed:', { initialQuery, initialKeywords });
    setSearchQuery(initialQuery);
    setOptionalKeywords(initialKeywords);
    setShowOptionalKeywords(!!initialKeywords);
  }, [initialQuery, initialKeywords]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('SearchForm: Form submitted', { searchQuery, optionalKeywords, showOptionalKeywords });

      // Call the parent's onSearch function
      if (onSearch) {
        onSearch({
          query: searchQuery.trim(),
          keywords: showOptionalKeywords ? optionalKeywords.trim() : ''
        });
      }
    }
  };

  if (compact) {
    // Compact version for header area
    return (
      <div className="w-full">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label htmlFor="search-compact" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Find papers on any topic — try one word (e.g., AI, LLM)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="search-compact"
                name="search"
                type="text"
                required
                className="appearance-none rounded-xl relative block w-full pl-10 pr-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-base shadow-sm hover:shadow-md transition-all duration-200"
                placeholder="Find papers on any topic — try one word (e.g., AI, LLM)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                id="show-optional-keywords-compact"
                name="show-optional-keywords"
                type="checkbox"
                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg transition-all duration-200"
                checked={showOptionalKeywords}
                onChange={(e) => setShowOptionalKeywords(e.target.checked)}
              />
              <label htmlFor="show-optional-keywords-compact" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Add a new technology keyword
              </label>
            </div>
          </div>

          {showOptionalKeywords && (
            <div className="flex-1 min-w-[250px]">
              <label htmlFor="optional-keywords-compact" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Other technology
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <input
                  id="optional-keywords-compact"
                  name="optional-keywords"
                  type="text"
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 text-base shadow-sm hover:shadow-md transition-all duration-200"
                  placeholder="Enter optional keywords..."
                  value={optionalKeywords}
                  onChange={(e) => setOptionalKeywords(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="mb-1">
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-6 border border-transparent font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 btn-hover"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Full version for search page
  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="w-full space-y-3">
          <label htmlFor="search" className="block text-lg font-semibold text-gray-800">
            Find papers on any topic — try one word (e.g., AI, LLM) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="search"
              name="search"
              type="text"
              required
              className="appearance-none rounded-2xl relative block w-full pl-12 pr-6 py-4 border-2 border-gray-200 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:z-10 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              placeholder="Find papers on any topic — try one word (e.g., AI, LLM)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Checkbox to show/hide optional keywords */}
        <div className="w-full">
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 hover:border-indigo-200 transition-all duration-300">
            <input
              id="show-optional-keywords"
              name="show-optional-keywords"
              type="checkbox"
              className="h-6 w-6 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-lg transition-all duration-200"
              checked={showOptionalKeywords}
              onChange={(e) => setShowOptionalKeywords(e.target.checked)}
            />
            <label htmlFor="show-optional-keywords" className="text-lg font-medium text-gray-800 cursor-pointer">
              Add a new technology keyword
            </label>
            {!showOptionalKeywords && (
              <span className="ml-auto text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                Optional
              </span>
            )}
          </div>
        </div>

        {/* Optional keywords field - only shown when checkbox is ticked */}
        {showOptionalKeywords && (
          <div className="w-full space-y-3 animate-fadeIn">
            <label htmlFor="optional-keywords" className="block text-lg font-semibold text-gray-800">
              Other technology
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <input
                id="optional-keywords"
                name="optional-keywords"
                type="text"
                className="appearance-none rounded-2xl relative block w-full pl-12 pr-6 py-4 border-2 border-purple-200 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 focus:z-10 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                placeholder="Enter specific terms (comma-separated)..."
                value={optionalKeywords}
                onChange={(e) => setOptionalKeywords(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Add specific terms to refine your search results</span>
            </div>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full flex justify-center items-center py-4 px-8 border border-transparent font-bold rounded-2xl text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 text-xl shadow-2xl hover:shadow-3xl hover:-translate-y-1 transform btn-hover"
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search Papers
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
