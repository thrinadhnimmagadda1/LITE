import React from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import logo from '../logo.svg';

const Header = ({ onSearch, onCategorySelect }) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="ml-2 text-xl font-semibold text-gray-900">Evolution</span>
            </Link>
          </div>
          <SearchBar onSearch={onSearch} onCategorySelect={onCategorySelect} />
          <nav className="ml-6 flex items-center space-x-4">
            <Link to="/" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">Home</Link>
            <Link to="/about" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">About</Link>
            {/* <Link to="/contact" className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium">Contact</Link> */}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
