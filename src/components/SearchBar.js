import React, { useState } from 'react';
import { categories } from '../constants/categories';

const SearchBar = ({ onSearch, onCategorySelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleCategoryClick = (category) => {
    onCategorySelect?.(category);
  };

  return (
    <div className="flex-1 max-w-3xl ml-6">
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full px-4 py-2 border border-gray-300 rounded-l-md focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Search
        </button>
      </form>
      
      
    </div>
  );
};

export default SearchBar;
