import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({
  searchTerm,
  onSearch,
  onSearchTermChange,
  onBack,
  showBackButton = false,
  className = ''
}) => {
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };
  
  // Handle clear search
  const handleClearSearch = () => {
    onSearchTermChange('');
  };
  return (
    <header className={`bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200 sticky top-0 z-10 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row with logo, back button, and navigation */}
        <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            {showBackButton ? (
              <button
                onClick={onBack}
                className="mr-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Back to search"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            ) : (
              <Link to="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                LitEvo
              </Link>
            )}
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/about" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              About
            </Link>
          </nav>
        </div>

        {/* Search row */}
        <div className="py-3">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex flex-col gap-3">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchTermChange(e.target.value)}
                  placeholder="Search papers by title, author, or keywords..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
                >
                  Search
                </button>
              </div>
              
              {/* LLM Model Quick Search Buttons */}
              <div className="flex flex-col gap-2">
                {/* <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Models:</span>
                  {['LLM', 'GPT-4', 'transformers', 'BERT'].map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => onFilterByCluster(model)}
                      className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                    >
                      {model}
                    </button>
                  ))}
                </div> */}
                {/* <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Planning:</span>
                  {[
                    'automated planning',
                    'symbolic planning',
                    'neurosymbolic planning',
                    'task planning',
                    'AI planning',
                    'PDDL',
                    'constraint-based planning',
                    'hierarchical task planning',
                    'multi-agent planning',
                    'robot planning'
                  ].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => onFilterByCluster(term)}
                      className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div> */}
              </div>
            </div>
          </form>
        </div>
      </div>
    </header>
  );
};

export default Header;
