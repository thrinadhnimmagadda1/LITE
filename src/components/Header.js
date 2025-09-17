import React from 'react';
import { Link } from 'react-router-dom';
import { useLogs } from '../context/LogsContext';

const Header = ({
  onBack,
  showBackButton = false,
  className = '',
  handleBackClick,
  onSearch,
  currentSearch
}) => {
  const { addLog } = useLogs();
  
  const handleBackNavigation = () => {
    if (handleBackClick) {
      handleBackClick();
    } else if (onBack) {
      addLog({
        type: 'info',
        message: 'Navigating back to search page',
        details: { from: 'results', to: 'search' }
      });
      onBack();
    }
  };

  const handleLiteLogoClick = () => {
    addLog({
      type: 'info',
      message: 'LITE logo clicked - navigating to home page',
      details: { from: 'results', to: 'home' }
    });
    
    // Use the existing navigation pattern
    if (handleBackClick) {
      handleBackClick();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <header className={`bg-white/90 backdrop-blur-sm shadow-xl border-b border-white/20 transition-all duration-300 sticky top-0 z-10 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={handleBackNavigation}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Search</span>
              </button>
            )}
            
            <div 
              onClick={handleLiteLogoClick}
              className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300 cursor-pointer"
            >
              LITE
            </div>
          </div>
          

          
          <div className="flex items-center space-x-4">
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors duration-200 hover:scale-105">
              About
            </a>
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors duration-200 hover:scale-105">
              Help
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
