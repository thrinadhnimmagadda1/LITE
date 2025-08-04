import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchPage = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [optionalKeywords, setOptionalKeywords] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Combine main search query with optional keywords if provided
      const searchParams = {
        query: searchQuery.trim(),
        keywords: optionalKeywords.trim()
      };
      onSearch(searchParams);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-4xl font-extrabold text-gray-900">
            LITE
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Discover the latest research papers in your field of interest
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="rounded-md shadow-sm">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                  Search terms (required)
                </label>
                <input
                  id="search"
                  name="search"
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-base"
                  placeholder="e.g., machine learning, AI, deep learning"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="rounded-md shadow-sm">
              <div>
                <label htmlFor="optional-keywords" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                  Optional keywords (comma-separated)
                </label>
                <input
                  id="optional-keywords"
                  name="optional-keywords"
                  type="text"
                  className="appearance-none rounded-lg relative block w-full px-5 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-base"
                  placeholder="e.g., transformer, attention, BERT (optional)"
                  value={optionalKeywords}
                  onChange={(e) => setOptionalKeywords(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-left">
                  Add specific terms to refine your search (optional)
                </p>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Search Papers
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>Example searches: "neural networks", "computer vision", "NLP"</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SearchPage;
