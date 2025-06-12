import React from 'react';
import { Link } from 'react-router-dom';
import { categories } from '../constants/categories';

const ListSection = ({ title, items = [], onCategorySelect }) => {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {/* Categories Section */}
        <div className="px-4 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold mb-3"> Latest Categories</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategorySelect?.(category.name)}
                className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:text-white dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Header Section */}
        <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-300">
            {items.length} items in total
          </p>
        </div>

        {/* Content Section */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item, index) => (
              <li key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                <Link 
                  to={`/items/${item.id}`} 
                  className="block px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                      {item.title}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">View details →</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {item.technologies?.map((tech, techIndex) => (
                        <button
                          key={techIndex}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCategorySelect?.(tech);
                          }}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                        >
                          {tech}
                        </button>
                      ))}
                    </div>
                    <div className="sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {item.line1}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>{item.line2}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm text-gray-500">
                      {item.line3}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ListSection;
