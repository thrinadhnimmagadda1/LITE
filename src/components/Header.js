import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({
  onBack,
  showBackButton = false,
  className = ''
}) => {
  return (
    <header className={`bg-white dark:bg-gray-800 shadow-sm transition-colors duration-200 sticky top-0 z-10 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>
    </header>
  );
};

export default Header;
