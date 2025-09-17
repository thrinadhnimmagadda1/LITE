

import React, { useState, useEffect, useCallback } from 'react';
import { useSearch } from '../context/SearchContext';
import SearchForm from './SearchForm';
import { useNavigate } from 'react-router-dom';
import { useLogs } from '../context/LogsContext';

const SearchPage = ({ onSearch }) => {
  const navigate = useNavigate();
  const { addLog } = useLogs();
  const { searchHistory, addToHistory } = useSearch();
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

  const handleSearch = (searchParams) => {
    console.log('SearchPage: Search initiated', searchParams);
    
    // Add to search history
    addToHistory(searchParams);
    
    // Add log for search initiation from SearchPage
    addLog({
      type: 'info',
      message: 'Search initiated from SearchPage',
      details: searchParams
    });
    
    if (onSearch) {
      onSearch(searchParams);
    }
    
    // Navigate to results page
    navigate('/results');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-slideInUp">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 gradient-text">
              LITE
            </h1>
            <p className="text-base text-gray-600 max-w-md mx-auto leading-relaxed">
              Discover the latest research papers in your field of interest with AI-powered search and intelligent clustering
            </p>
          </div>
          
          {/* Main Search Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-10 mb-12 card-hover">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Search Research Papers</h2>
            </div>
            
                        <SearchForm 
              onSearch={handleSearch} 
              initialQuery={initialSearch.query}
              initialKeywords={initialSearch.keywords}
            />
            

          </div>
          
          {/* Search History Section */}
          {searchHistory.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 card-hover">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Recently Searched</span>
                </h3>
                <button 
                  onClick={() => setInitialSearch({ query: '', keywords: '' })}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all duration-200 hover:shadow-md btn-hover"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className="group p-5 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 rounded-2xl border border-gray-200 hover:border-indigo-300 transition-all duration-300 text-left hover:shadow-lg hover:-translate-y-1 card-hover"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors text-lg">
                        {search.query}
                      </span>
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                    
                    {search.keywords && (
                      <div className="mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 group-hover:bg-indigo-200 transition-colors">
                          + {search.keywords}
                        </span>
                      </div>
                    )}
                    
                    <span className="text-xs text-gray-500 group-hover:text-indigo-600 transition-colors">
                      {new Date(search.timestamp).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          

        </div>
      </div>
    </div>
  );
};

export default SearchPage;
