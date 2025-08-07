import { createContext, useContext, useState, useCallback } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchHistory, setSearchHistory] = useState([]);
  const [currentSearch, setCurrentSearch] = useState({ query: '', keywords: '' });

  const addToHistory = useCallback((searchParams) => {
    setSearchHistory(prevHistory => {
      // Add timestamp to the search
      const searchWithTimestamp = {
        ...searchParams,
        timestamp: new Date().toISOString()
      };
      
      // Remove any existing entry with the same query and keywords
      const filteredHistory = prevHistory.filter(
        item => !(item.query === searchParams.query && 
                item.keywords === searchParams.keywords)
      );
      
      // Add new search to the beginning of the history and keep only last 10 searches
      return [searchWithTimestamp, ...filteredHistory].slice(0, 10);
    });
    
    // Update current search without modifying the original object
    setCurrentSearch({
      ...searchParams,
      timestamp: new Date().toISOString()
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    setCurrentSearch({ query: '', keywords: '' });
  }, []);

  return (
    <SearchContext.Provider 
      value={{
        searchHistory,
        currentSearch,
        addToHistory,
        clearHistory,
        setCurrentSearch
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
