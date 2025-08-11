import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { fetchPapers, updateSearchTerms } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import { useSearch } from './context/SearchContext';
import SearchForm from './components/SearchForm';
import PublicationsChart from './components/PublicationsChart';
import ClustersChart from './components/ClustersChart';
import ListSection from './components/ListSection';
import SearchPage from './components/SearchPage';
import Header from './components/Header';
import Pagination from './components/Pagination';
import './App.css';

function App() {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get search context
  const { currentSearch, setCurrentSearch } = useSearch();
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('papers');
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [papersCache, setPapersCache] = useState({});
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [optionalKeywords, setOptionalKeywords] = useState('');
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 100,  // Increased from 20 to 100 to show all papers
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrevious: false
  });

  // Handler for when a month is selected in the publications chart
  const handleMonthSelect = useCallback((monthIndex) => {
    setSelectedMonthIndex(prevIndex => 
      prevIndex === monthIndex ? null : monthIndex
    );
    
    if (monthIndex !== null && items.length > 0) {
      // Filter items for the selected month
      const filtered = items.filter(item => {
        if (!item || !item.line2) return false;
        try {
          const dateStr = item.line2.replace('Published:', '').trim();
          const paperDate = new Date(dateStr);
          return paperDate.getMonth() === monthIndex % 12 && 
                 paperDate.getFullYear() === (new Date()).getFullYear() - Math.floor(monthIndex / 12);
        } catch (e) {
          return false;
        }
      });
      setFilteredItems(filtered);
    } else {
      // Reset to show all items if no month is selected
      setFilteredItems(items);
    }
  }, [items]);

  // Handler for when a paper is selected from the clusters chart
  const handlePaperSelect = useCallback((paperId) => {
    if (!paperId) {
      setSelectedPaper(null);
      return;
    }
    
    const paper = items.find(item => item.id === paperId || item.paper_id === paperId);
    if (paper) {
      setSelectedPaper(paper);
      // Scroll to the selected paper in the list
      const element = document.getElementById(`paper-${paperId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-indigo-500');
        }, 2000);
      }
    }
  }, [items]);

  // Handler for category selection
  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(prevCategory => 
      prevCategory === category ? null : category
    );
    
    if (category) {
      const filtered = items.filter(item => 
        item.categories && item.categories.includes(category)
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [items]);

  // Update chart data when items change
  const updateChartData = useCallback((items) => {
    console.log('=== START updateChartData ===');
    console.log('Number of items to process:', items.length);
    
    // Log first 3 items for inspection
    const sampleItems = items.slice(0, 3);
    console.log('Sample items (first 3):', JSON.parse(JSON.stringify(sampleItems, (key, value) => {
      // Remove large fields for better readability
      if (key === 'abstract' || key === 'summary' || key === 'line3') return '[REDACTED]';
      return value;
    }, 2)));
    
    // Log all available keys in the first item to understand the data structure
    if (items.length > 0) {
      const firstItem = items[0];
      console.log('Available keys in first item:', Object.keys(firstItem));
      console.log('First item _original keys:', firstItem._original ? Object.keys(firstItem._original) : 'No _original');
      
      // Log all date-related fields from the first item
      console.log('Date-related fields in first item:', {
        Month: firstItem.Month,
        Year: firstItem.Year,
        published: firstItem.published,
        line2: firstItem.line2,
        _original_Month: firstItem._original?.Month,
        _original_Year: firstItem._original?.Year,
        _original_published: firstItem._original?.published,
        _original_date: firstItem._original?.date,
        _original_created: firstItem._original?.created,
        _original_updated: firstItem._original?.updated
      });
    }
    
    // Log all unique Month/Year combinations found
    const monthYearCounts = {};
    items.forEach(item => {
      const monthYear = `${item.Month || 'No Month'}-${item.Year || 'No Year'}`;
      monthYearCounts[monthYear] = (monthYearCounts[monthYear] || 0) + 1;
    });
    console.log('Month/Year combinations found:', monthYearCounts);
    
    try {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Group papers by year and month
      const papersByDate = {};
      
      items.forEach(item => {
        try {
          if (!item) return;
          
          // Try to get month and year from the paper data
          let paperMonth, paperYear;
          
          // Debug log the item structure
          console.log('Processing item for dates:', {
            id: item.id,
            hasMonth: !!item.Month,
            hasYear: !!item.Year,
            published: item.published,
            hasOriginal: !!item._original,
            originalPublished: item._original?.published,
            originalMonth: item._original?.Month,
            originalYear: item._original?.Year
          });

          // Try all possible ways to extract month and year
          const dateExtractors = [
            // 1. Direct Month/Year fields (from backend)
            () => {
              if (!item.Month || !item.Year) return null;
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                'July', 'August', 'September', 'October', 'November', 'December'];
              const monthIndex = monthNames.findIndex(m => 
                m.toLowerCase() === item.Month.toLowerCase()
              );
              const year = parseInt(item.Year, 10);
              if (monthIndex !== -1 && !isNaN(year)) {
                const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                papersByDate[key] = (papersByDate[key] || 0) + 1;
                return { month: monthIndex, year };
              }
              return null;
            },
            
            // 2. From _original.Month/Year
            () => {
              if (!item._original?.Month || !item._original?.Year) return null;
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                'July', 'August', 'September', 'October', 'November', 'December'];
              const monthIndex = monthNames.findIndex(m => 
                m.toLowerCase() === item._original.Month.toLowerCase()
              );
              const year = parseInt(item._original.Year, 10);
              if (!isNaN(year) && monthIndex !== -1) {
                const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
                papersByDate[key] = (papersByDate[key] || 0) + 1;
                return { month: monthIndex, year };
              }
              return null;
            },
            
            // 3. From published date string
            () => {
              if (!item.published) return null;
              try {
                const date = new Date(item.published);
                if (isNaN(date.getTime())) return null;
                const year = date.getFullYear();
                const month = date.getMonth();
                const key = `${year}-${String(month + 1).padStart(2, '0')}`;
                papersByDate[key] = (papersByDate[key] || 0) + 1;
                return { month, year };
              } catch (e) {
                return null;
              }
            }
          ];
          
          // Try each extraction method until we find a valid date
          for (const extractor of dateExtractors) {
            const result = extractor();
            if (result) break;
          }
        } catch (error) {
          console.error('Error processing paper item:', { item, error });
        }
      });
        
        // Generate labels and data for the chart
        const labels = [];
        const papersCount = [];
        const currentDate = new Date();
        currentDate.setMonth(0); // Start from January
        
        // Generate data for the last 12 months
        for (let i = 0; i < 12; i++) {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const key = `${year}-${String(month + 1).padStart(2, '0')}`;
          
          // Add to labels and data
          labels.push(`${monthNames[month]} ${year}`);
          papersCount.push(papersByDate[key] || 0);
          
          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      
      // Ensure we have valid data to display
      if (papersCount.length === 0 || labels.length === 0) {
        console.warn('No valid date data found for chart, using default values');
        // Generate some default data to prevent chart errors
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const defaultLabels = monthNames.map(month => `${month} ${currentYear}`);
        
        setChartData({
          labels: defaultLabels,
          datasets: [{
            label: 'Publications',
            data: Array(12).fill(0),
            fill: true,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderColor: 'rgba(99, 102, 241, 0.8)',
            tension: 0.1,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        });
        return;
      }
      
      setChartData({
        labels,
        datasets: [{
          label: 'Publications',
          data: papersCount,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderColor: 'rgba(99, 102, 241, 0.8)',
          tension: 0.1,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      });
      
    } catch (error) {
      console.error('Error updating chart data:', error);
      // Set some default data to prevent UI from breaking
      const defaultLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        .map(month => `${month} ${new Date().getFullYear()}`);
      
      setChartData({
        labels: defaultLabels,
        datasets: [{
          label: 'Publications',
          data: Array(12).fill(0),
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderColor: 'rgba(99, 102, 241, 0.8)',
          tension: 0.1,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      });
    }
  }, []);

  // Load papers data with caching and state management
  const loadPapers = useCallback(async (page = 1, pageSize = 20, forceRefresh = false) => {
    const cacheKey = `page_${page}_size_${pageSize}`;
    console.log(`[loadPapers] Loading papers - Page: ${page}, PageSize: ${pageSize}, ForceRefresh: ${forceRefresh}`);
    
    // If we have cached data and not forcing refresh, use it
    if (papersCache[cacheKey] && !forceRefresh) {
      const { papers, pagination } = papersCache[cacheKey];
      console.log(`[loadPapers] Using cached data for key: ${cacheKey}, Papers count: ${papers.length}`);
      
      // Batch state updates to minimize re-renders
      ReactDOM.unstable_batchedUpdates(() => {
        setItems(papers);
        setFilteredItems(papers);
        setPagination(pagination);
        updateChartData(papers);
      });
      
      return;
    }
    
    console.log('[loadPapers] Fetching fresh data from API...');
    setIsLoading(true);
    
    try {
      const data = await fetchPapers({ page, pageSize });
      console.log('[loadPapers] Fetched data from API:', {
        papersCount: data.papers?.length || 0,
        pagination: data.pagination
      });
      
      if (!data.papers || !Array.isArray(data.papers)) {
        throw new Error('Invalid papers data received from API');
      }
      
      // Process papers data
      const validItems = [];
      const allCategories = new Set();
      
      // Process each paper in the response
      for (const paper of data.papers) {
        try {
          if (!paper) continue;
          
          // Process categories
          let categories = [];
          if (paper.categories) {
            // Try different separators
            const separators = [',', '|', ';', ' '];
            let categoryParts = [paper.categories];
            
            // Find the most appropriate separator
            for (const sep of separators) {
              if (paper.categories.includes(sep)) {
                categoryParts = paper.categories.split(sep).map(cat => cat.trim()).filter(Boolean);
                break;
              }
            }
            
            // If we still have a single long category, try splitting by dots or other common patterns
            if (categoryParts.length === 1 && categoryParts[0].length > 20) {
              const complexSplits = categoryParts[0].split(/[.\s-]/).filter(Boolean);
              if (complexSplits.length > 1) {
                categoryParts = complexSplits;
              }
            }
            
            categories = [...new Set(categoryParts)].filter(Boolean);
          }
          
          // If no categories found, use a default
          if (categories.length === 0 && paper.cluster_label) {
            categories = [paper.cluster_label];
          } else if (categories.length === 0) {
            categories = ['Uncategorized'];
          }
          
          // Update all categories set
          categories.forEach(cat => allCategories.add(cat));
          
          // Format the paper data for the UI
          const formattedPaper = {
            id: paper.id || `paper-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: paper.title || 'Untitled',
            line1: paper.authors || 'Unknown Author',
            line2: `Published: ${paper.published || 'Date not available'}`,
            abstract: paper.abstract || paper.Abstract || paper.summary || 'No abstract available',
            line3: paper.abstract || paper.Abstract || paper.summary || 'No abstract available',
            line4: paper.url || paper.URL || '#',
            categories: categories,
            technologies: categories,
            Cluster: paper.cluster_label || paper.Cluster || paper.cluster || 'Uncategorized',
            ...(paper.x !== undefined && { x: paper.x }),
            ...(paper.y !== undefined && { y: paper.y }),
            _original: paper,
            Month: paper.Month || (paper.published ? new Date(paper.published).toLocaleString('default', { month: 'long' }) : null),
            Year: paper.Year || (paper.published ? new Date(paper.published).getFullYear() : null)
          };
          
          validItems.push(formattedPaper);
        } catch (error) {
          console.error('Error formatting paper:', {
            error: error.message,
            paper: paper,
            stack: error.stack
          });
        }
      }
      
      console.log(`Successfully processed ${validItems.length} papers`);
      
      // Update state with the new data (append if loading more pages)
      if (page > 1) {
        setItems(prevItems => [...prevItems, ...validItems]);
      } else {
        setItems(validItems);
      }
      
      // Update filtered items with the current page's data
      setFilteredItems(validItems);
      
      // Update chart data with all available items (only on first page load)
      if (page === 1) {
        try {
          updateChartData(validItems);
        } catch (chartError) {
          console.error('Error updating chart data:', chartError);
        }
      }
      
      console.log(`Page ${page} loaded successfully with ${validItems.length} items`);
    } catch (error) {
      console.error('Error loading data:', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Set some default data to prevent UI from breaking
      const errorItem = {
        id: 'error-1',
        title: 'Error Loading Papers',
        line1: 'Could not load paper data',
        line2: 'Please check the console for more details',
        line3: error.message,
        line4: '#',
        categories: ['error'],
        technologies: ['error'],
        Cluster: 'Error',
        _error: error.message,
        _original: {}
      };
      
      setItems([errorItem]);
      setFilteredItems([errorItem]);
    } finally {
      setIsLoading(false);
    }
  }, [updateChartData]);

  // Load initial data on component mount
  useEffect(() => {
    loadPapers(1, 20);
  }, []); // Removed loadPapers from deps to prevent infinite loops
  
  // Handle pagination controls
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadPapers(newPage, pagination.pageSize);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handle page size change
  const handlePageSizeChange = (event) => {
    const newSize = parseInt(event.target.value, 10);
    loadPapers(1, newSize);
  };

  // Handle search submission
  const handleSearch = useCallback(async (searchParams) => {
    console.log('Search initiated with params:', searchParams);
    
    // Handle both direct string (backward compatibility) and object with query/keywords
    let query = '';
    let keywords = '';
    
    if (typeof searchParams === 'string') {
      query = searchParams.trim();
      if (!query) return;
      searchParams = { query };
    } else if (searchParams && typeof searchParams === 'object') {
      query = searchParams.query?.trim() || '';
      keywords = searchParams.keywords?.trim() || '';
      setOptionalKeywords(keywords); // Update the optional keywords state
      if (!query) return;
    } else {
      console.error('Invalid search parameters:', searchParams);
      return;
    }
    
    // Update search term state
    setSearchTerm(query);
    setHasSearched(true);
    setIsLoading(true);
    setSelectedMonthIndex(null);
    setSelectedCategory(null);
    
    try {
      // Call the backend API with search parameters
      const searchPayload = {
        query: query,
        ...(keywords && { 
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean) 
        })
      };
      
      console.log('Sending search payload:', searchPayload);
      
      // First update the search terms in the backend
      const response = await updateSearchTerms(searchPayload);
      console.log('Backend update response:', response);
      
      // Handle different response formats
      if (response.warning) {
        console.warn('Warning from backend:', response.warning);
        alert(response.warning);
        return;
      }
      
      // Update current search in context
      setCurrentSearch({
        query: query,
        keywords: keywords
      });
      
      // Reset to first page when performing a new search
      await loadPapers(1, pagination.pageSize, searchParams);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, loadPapers, setCurrentSearch]);

  // Handle cluster filter
  const filterByCluster = useCallback((clusterName) => {
    console.log('Filtering by cluster:', clusterName);
    
    // Get all unique cluster names and log some sample items
    const allClusters = {};
    const sampleItems = [];
    
    items.forEach((item, index) => {
      // Check both item.Cluster and item.cluster for compatibility
      const cluster = item.Cluster || item.cluster;
      if (cluster) {
        allClusters[cluster] = (allClusters[cluster] || 0) + 1;
        
        // Save some sample items for debugging
        if (index < 5) {
          sampleItems.push({
            title: item.title || item.Title,
            cluster: cluster,
            rawData: item
          });
        }
      }
    });
    
    console.log('All available clusters with counts:', allClusters);
    console.log('Sample items with clusters:', sampleItems);
    
    // Map of button labels to the actual search terms from config
    const modelToSearchTerms = {
      'LLaMA': 'large language models',
      'GPT-4': 'GPT',
      'Gemini': 'large language models',
      'Claude': 'large language models',
      'Mistral': 'large language models',
      'PaLM': 'large language models',
      'BERT': 'BERT',
      'T5': 'transformers'
    };
    
    // Get the search term for the clicked model
    const searchTerm = modelToSearchTerms[clusterName] || clusterName;
    
    console.log('Searching for term:', searchTerm);
    
    const results = items.filter(item => {
      // Check title, abstract, and categories for the search term
      const searchIn = [
        item.title || item.Title || '',
        item.line3 || item.Abstract || '',
        (item.categories || []).join(' '),
        item.Cluster || item.cluster || ''
      ].join(' ').toLowerCase();
      
      const matches = searchIn.includes(searchTerm.toLowerCase());
      
      if (matches) {
        console.log('Matching item:', {
          title: item.title || item.Title,
          cluster: item.Cluster || item.cluster,
          categories: item.categories
        });
      }
      
      return matches;
    });
    
    console.log(`Found ${results.length} items for cluster '${clusterName}'`);
    setFilteredItems(results);
    setIsSearching(true);
    setSearchTerm('');
  }, [items]);

  // Clear search 
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setFilteredItems([...items]);
    setIsSearching(false);
    setSelectedMonthIndex(null);
  }, [items]);

  // Clear month filter
  const clearMonthFilter = useCallback(() => {
    setSelectedMonthIndex(null);
    setFilteredItems([...items]);
    setIsSearching(false);
  }, [items]);

  // Filter papers by selected month
  const filterPapersByMonth = useCallback((monthIndex) => {
    if (selectedMonthIndex === monthIndex) {
      clearMonthFilter();
      return;
    }
    
    const label = chartData.labels[monthIndex];
    if (!label) return;
    
    const [monthStr, yearStr] = label.split(' ');
    const month = new Date(`${monthStr} 1, ${yearStr}`).getMonth();
    const year = parseInt(yearStr);
    
    const filtered = items.filter(item => {
      if (!item.line2) return false;
      const dateStr = item.line2.replace('Date: ', '').trim();
      const paperDate = new Date(dateStr);
      if (isNaN(paperDate.getTime())) return false;
      
      return paperDate.getMonth() === month && 
             paperDate.getFullYear() === year;
    });
    
    setSelectedMonthIndex(monthIndex);
    setFilteredItems(filtered);
    setIsSearching(true);
  }, [chartData.labels, items, selectedMonthIndex, clearMonthFilter]);

  // Navigation tabs
  const tabs = [
    { id: 'papers', label: 'Papers' },
    { id: 'clusters', label: 'Clusters' },
  ];

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Searching for research papers...</p>
        </div>
      </div>
    );
  }

  // Show search page if no search has been performed
  if (!hasSearched) {
    return (
      <ThemeProvider>
        <SearchPage onSearch={handleSearch} />
      </ThemeProvider>
    );
  }

  // Show results after search
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Header 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="sticky top-0 z-10"
          showBackButton={hasSearched}
          onBack={() => setHasSearched(false)}
        />
        
        {/* Search Form under Header */}
        <div className="bg-white dark:bg-gray-800 shadow-md">
          <div className="container mx-auto px-4 py-4">
            <div className="max-w-4xl mx-auto">
              <SearchForm 
                onSearch={handleSearch} 
                initialQuery={currentSearch?.query || ''}
                initialKeywords={currentSearch?.keywords || ''}
                compact={true}
              />
            </div>
          </div>
        </div>
        
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-8">
            {/* Main Search Form - Only show on search page */}
            {!hasSearched && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Search Papers
                </h2>
                <SearchForm 
                  onSearch={handleSearch} 
                  initialQuery={currentSearch?.query || ''}
                  initialKeywords={currentSearch?.keywords || ''}
                  selectedMonthIndex={selectedMonthIndex}
                />
              </div>
            )}
            
            {activeTab === 'papers' ? (
              <div className="space-y-6">
                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Publications Over Time Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Publications Over Time
                    </h2>
                    <div className="h-80">
                      <PublicationsChart 
                        data={chartData}
                        onMonthSelect={handleMonthSelect}
                        selectedMonthIndex={selectedMonthIndex}
                        onClearSelection={clearMonthFilter}
                      />
                    </div>
                  </div>
                  
                  {/* Paper Clusters Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Paper Clusters
                    </h2>
                    <div className="h-80">
                      <ClustersChart 
                        papers={items}
                        onPaperSelect={handlePaperSelect}
                        onCategorySelect={handleCategorySelect}
                        selectedCategory={selectedCategory}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Papers List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {searchTerm 
                          ? `Search Results for "${searchTerm}${optionalKeywords ? ` ,${optionalKeywords}` : ''}"` 
                          : 'Latest Publications'}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Showing {items.length} of {pagination.totalItems} {pagination.totalItems === 1 ? 'result' : 'results'}
                      </p>
                    </div>
                    
                    {!isLoading && items.length > 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </div>
                    )}
                  </div>
                  
                  <ListSection 
                    items={items}
                    isLoading={isLoading && pagination.currentPage === 1}
                    onItemClick={handlePaperSelect}
                    selectedItemId={selectedPaper?.id}
                    onCategorySelect={handleCategorySelect}
                  />
                  
                  {items.length === 0 && !isLoading ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-500 dark:text-gray-400">No papers found. Try a different search term.</p>
                    </div>
                  ) : (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                      <Pagination
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                        pageSize={pagination.pageSize}
                        onPageSizeChange={handlePageSizeChange}
                        totalItems={pagination.totalItems}
                        hasNext={pagination.hasNext}
                        hasPrevious={pagination.hasPrevious}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Clusters View
                </h2>
                <ClustersChart 
                  papers={items}
                  onPaperSelect={handlePaperSelect}
                  expandedView={true}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
