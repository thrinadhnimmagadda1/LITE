import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ListSection = ({ items = [], onCategorySelect, onItemClick }) => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);

  const toggleAbstract = (e, itemId) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedId(prevId => (prevId === itemId ? null : itemId));
  };

  const handleItemClick = (e, itemId) => {
    const isAbstractClick = e.target.closest('.abstract-toggle') || 
                         e.target.closest('.abstract-content');
    
    if (!isAbstractClick) {
      onItemClick?.(itemId);
      navigate(`/item/${itemId}`);
    }
  };

  // const formatDate = (dateString) => {
  //   if (!dateString) return 'N/A';
  //   try {
  //     const cleanDate = String(dateString).replace('Date : ', '').trim();
  //     const date = new Date(cleanDate);
  //     return isNaN(date.getTime()) 
  //       ? 'N/A' 
  //       : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  //   } catch (error) {
  //     console.error('Error formatting date:', error);
  //     return 'N/A';
  //   }
  // };

  const getItemProperty = (item, prop, defaultValue = '') => {
    if (!item) return defaultValue;
    const value = item[prop];
    return value !== undefined && value !== null ? value : defaultValue;
  };

  // Generate a unique ID for each item using a counter
  let counter = 0;
  const generateItemId = (item, index) => {
    counter += 1;
    
    // First try to use existing unique identifiers
    if (item?.id) return `item-${item.id}`;
    if (item?.paper_id) return `paper-${item.paper_id}`;
    
    // Then try to create a unique key from content
    const title = item?.title ? String(item.title).substring(0, 20) : '';
    const line1 = item?.line1 ? String(item.line1).substring(0, 20) : '';
    const abstract = item?.abstract ? String(item.abstract).substring(0, 20) : '';
    
    // Create a content-based key if possible
    if (title || line1 || abstract) {
      const contentKey = `${title}-${line1}-${abstract}`.replace(/\s+/g, '-');
      return `content-${contentKey}-${counter}`;
    }
    
    // Fallback to a completely unique key
    return `fallback-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}-${counter}`;
  };

  const renderPaperItem = (item, index) => {
    if (!item) return null;
    
    // Generate a unique ID for this item
    const itemId = generateItemId(item, index);
    const title = getItemProperty(item, 'title', 'Untitled Paper');
    const line1 = getItemProperty(item, 'line1');
    const line2 = getItemProperty(item, 'line2');
    const technologies = Array.isArray(item.technologies) ? item.technologies : [];
    const hasAbstract = Boolean(item.abstract || item.line3);
    
    return (
      <div 
        key={itemId}
        className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-200"
        onClick={(e) => handleItemClick(e, itemId)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleItemClick(e, itemId)}
        style={{ cursor: 'pointer' }}
      >
        <div className="p-6">
          <div className="flex flex-col space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {title}
              </h3>
              {/* <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                {formatDate(line2)}
              </span> */}
            </div>
          
            {line1 && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {line1}
              </p>
            )}

            {technologies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {technologies.map((tech, techIndex) => {
                  const techText = String(tech || '').trim();
                  return techText ? (
                    <span
                      key={`tech-${itemId}-${techIndex}`}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200"
                    >
                      {techText}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <div className="flex justify-between items-center mt-3">
              {hasAbstract && (
                <button
                  onClick={(e) => toggleAbstract(e, itemId)}
                  className="abstract-toggle flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 focus:outline-none transition-all duration-200 group"
                  aria-expanded={expandedId === itemId}
                  aria-controls={`abstract-${itemId}`}
                >
                  <span className="flex items-center">
                    <svg 
                      className={`w-4 h-4 mr-1.5 transition-transform duration-200 ${expandedId === itemId ? 'transform rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {expandedId === itemId ? 'Hide Abstract' : 'Read Abstract'}
                  </span>
                </button>
              )}
              
              {item.line4 && (
                <a 
                  href={item.line4} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors duration-200"
                  onClick={e => e.stopPropagation()}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Paper
                </a>
              )}
            </div>
          
            {hasAbstract && (
              <div 
                id={`abstract-${itemId}`}
                className={`mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedId === itemId ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
                aria-hidden={expandedId !== itemId}
              >
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mt-2">
                  <div className="flex items-center mb-2">
                    <svg className="w-4 h-4 text-indigo-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Abstract</h4>
                  </div>
                  <div className="pl-6">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed tracking-wide">
                      {getItemProperty(item, 'abstract', getItemProperty(item, 'line3', 'No abstract available.'))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Process items to ensure they're valid and have unique keys
  const validItems = [];
  const usedKeys = new Set();
  
  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      if (item == null) return;
      
      // Generate a unique key for this item
      let itemKey = generateItemId(item, index);
      
      // Ensure the key is unique
      while (usedKeys.has(itemKey)) {
        itemKey = `${itemKey}-${Math.random().toString(36).substr(2, 4)}`;
      }
      
      usedKeys.add(itemKey);
      validItems.push({
        ...item,
        _key: itemKey // Store the generated key with the item
      });
    });
  }
  
  return (
    <div className="space-y-6">
      {validItems.length > 0 ? (
        validItems.map((item) => (
          <div key={item._key} id={`paper-${item._key}`}>
            {renderPaperItem(item, item._key)}
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No papers found. Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export default ListSection;
