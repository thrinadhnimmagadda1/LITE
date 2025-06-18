import React from 'react';

const Sidebar = ({ 
  onTechnologySelect, 
  selectedTechnologies = [], 
  onClearTechnologyFilter,
  allYears = [],
  selectedYears = [],
  onYearSelect,
  onClearYearFilter
}) => {
  // List of available technology stacks
  const technologies = [
    'Technology1', 'Technology2', 'Technology3', 'Technology4',
    'Technology5', 'Technology6', 'Technology7', 'Technology8'
  ];

  const handleTechnologyClick = (tech) => {
    onTechnologySelect(tech);
  };

  return (
    <div className="w-full h-full space-y-6">
      {/* Technology Stacks */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-6 transition-all duration-300 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Technology Stacks</h3>
          {selectedTechnologies.length > 0 && (
            <button 
              onClick={onClearTechnologyFilter}
              className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
            >
              Clear All ({selectedTechnologies.length})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {technologies.map((tech, index) => (
            <button
              key={`tech-${index}`}
              onClick={() => handleTechnologyClick(tech)}
              className={`px-4 py-3 rounded-lg transition-all shadow-sm ${
                selectedTechnologies.includes(tech)
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-800 transform -translate-y-0.5'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-500/50'
              }`}
            >
              <span className="font-medium text-sm">{tech}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Year Filter */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-6 transition-all duration-300 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Filter by Year</h3>
          {selectedYears.length > 0 && (
            <button 
              onClick={onClearYearFilter}
              className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
            >
              Clear All ({selectedYears.length})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {allYears.map((year, index) => (
            <button
              key={`year-${year}`}
              onClick={() => onYearSelect(year)}
              className={`px-4 py-3 rounded-lg transition-all shadow-sm ${
                selectedYears.includes(year)
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-800 transform -translate-y-0.5'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-500/50'
              }`}
            >
              <span className="font-medium text-sm">{year}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
