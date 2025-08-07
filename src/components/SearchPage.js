import React, { useState, useEffect, useCallback } from 'react';
import { useSearch } from '../context/SearchContext';
import SearchForm from './SearchForm';

const SearchPage = ({ onSearch }) => {
  const { searchHistory } = useSearch();
  const [initialSearch, setInitialSearch] = useState({ query: '', keywords: '' });

  // Initialize form with current search if available
  useEffect(() => {
    if (searchHistory.length > 0) {
      const lastSearch = searchHistory[0]; // Get the most recent search
      setInitialSearch({
        query: lastSearch.query || '',
        keywords: lastSearch.keywords || ''
      });
    }
  }, [searchHistory]);

  const handleSearch = useCallback((searchParams) => {
    onSearch(searchParams);
  }, [onSearch]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-indigo-600 mb-2">LITE</h1>
          <p className="text-lg text-gray-600">
            Discover the latest research papers in your field of interest
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-8 mb-10">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Search Research Papers</h2>
          <SearchForm 
            onSearch={handleSearch} 
            initialQuery={initialSearch.query}
            initialKeywords={initialSearch.keywords}
          />
          
          <div className="mt-4 text-sm text-gray-500 text-center">
            <p>Example searches: "neural networks", "computer vision", "NLP"</p>
          </div>
        </div>
        
        {searchHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Recently Searched</h3>
              <button 
                onClick={() => setInitialSearch({ query: '', keywords: '' })}
                className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchHistory.slice(0, 6).map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInitialSearch({
                      query: search.query,
                      keywords: search.keywords || ''
                    });
                    // Auto-scroll to search form
                    document.getElementById('search-form')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="group flex flex-col p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all duration-200 text-left"
                >
                  <span className="font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">
                    {search.query}
                  </span>
                  {search.keywords && (
                    <span className="mt-1 text-sm text-gray-500 group-hover:text-indigo-500 transition-colors">
                      + {search.keywords}
                    </span>
                  )}
                  <span className="mt-2 text-xs text-gray-400">
                    {new Date(search.timestamp).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
