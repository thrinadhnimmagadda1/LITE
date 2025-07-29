import React from 'react';
import { Link } from 'react-router-dom';


const Header = ({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  onFilterByCluster
}) => {
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearchSubmit(searchTerm);
  };
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top row with logo and navigation */}
        <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              LitEvo
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/about" className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              About
            </Link>
            {/* <TemeToggle /> */}
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
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search papers by title, author, or keywords..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={onClearSearch}
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
