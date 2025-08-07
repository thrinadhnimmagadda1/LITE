import React, { useState, useEffect, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 20,
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
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const labels = [];
      const papersCount = [];
      
      // Create data for the last 3 years
      for (let year = currentYear - 2; year <= currentYear; year++) {
        for (let month = 0; month < 12; month++) {
          if (year === currentYear && month > currentDate.getMonth()) break;
          
          const monthLabel = `${monthNames[month]} ${year}`;
          labels.push(monthLabel);
          
          // Count papers for this month
          const count = items.filter(item => {
            try {
              if (!item) return false;
              
              // Try to get date from different possible fields
              let dateStr = '';
              if (item._original && item._original.published) {
                dateStr = item._original.published;
              } else if (item._original && item._original.updated) {
                dateStr = item._original.updated;
              } else if (item._original && item._original.submitted_date) {
                dateStr = item._original.submitted_date;
              } else if (item.line2) {
                // Fall back to line2 format: "Published: YYYY-MM-DD"
                dateStr = item.line2.replace('Published:', '').trim();
              } else {
                return false; // No date information available
              }
              
              // Parse the date
              const paperDate = new Date(dateStr);
              if (isNaN(paperDate.getTime())) return false;
              
              return paperDate.getFullYear() === year && 
                    paperDate.getMonth() === month;
                    
            } catch (error) {
              console.warn('Error processing paper date:', {
                error: error.message,
                item: item
              });
              return false;
            }
          }).length;
          
          papersCount.push(count);
        }
      }
      
      // Ensure we have valid data to display
      if (papersCount.length === 0 || labels.length === 0) {
        console.warn('No valid date data found for chart, using default values');
        // Generate some default data to prevent chart errors
        const defaultLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          .map(month => `${month} ${currentYear}`);
        
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

  // Function to load papers data with pagination
  const loadPapers = useCallback(async (page = 1, pageSize = 20) => {
    try {
      console.log(`Starting to load papers (page ${page}, ${pageSize} items per page)...`);
      setIsLoading(true);
      
      // Clear previous data if it's the first page
      if (page === 1) {
        setItems([]);
        setFilteredItems([]);
      }
      
      // Fetch paginated papers and clustering data from the API
      console.log(`Fetching page ${page} with ${pageSize} items...`);
      const response = await fetchPapers({ page, pageSize });
      
      // Check if we have a valid response with papers
      if (!response || !response.papers || !Array.isArray(response.papers)) {
        throw new Error('Invalid data format received from API');
      }
      
      // Update pagination state
      if (response.pagination) {
        setPagination({
          currentPage: response.pagination.currentPage,
          pageSize: response.pagination.pageSize,
          totalPages: response.pagination.totalPages,
          totalItems: response.pagination.totalItems,
          hasNext: response.pagination.hasNext,
          hasPrevious: response.pagination.hasPrevious
        });
      }
      
      // Log clustering information if available
      if (response.clustering) {
        console.log('Clustering information:', {
          available: response.clustering.available,
          sourceFile: response.clustering.sourceFile,
          numClusters: response.clustering.numClusters
        });
      }
      
      console.log(`Received ${response.papers.length} papers from API (page ${page} of ${response.pagination?.totalPages || 1})`);
      
      // Process the papers data
      const dataToProcess = response.papers;
      
      // Transform data to match the expected format for the UI
      const formattedItems = dataToProcess.map(paper => {
        try {
          // Log a sample of the paper data for debugging
          if (Math.random() < 0.1) { // Log about 10% of papers
            console.log('Processing paper:', paper);
          }
          
          // Extract categories from categories field
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
              // Try splitting by dots or other common patterns
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
          
          // Format the paper data for the UI
          const formattedPaper = {
            id: paper.id || `paper-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: paper.title || 'Untitled',
            line1: paper.authors || 'Unknown Author',
            line2: `Published: ${paper.published || 'Date not available'}`,
            // Ensure abstract is properly passed through
            abstract: paper.abstract || paper.Abstract || paper.summary || 'No abstract available',
            line3: paper.abstract || paper.Abstract || paper.summary || 'No abstract available',
            line4: paper.url || paper.URL || '#',
            categories: categories,
            technologies: categories, // Using categories as technologies for now
            Cluster: paper.cluster_label || paper.Cluster || paper.cluster || 'Uncategorized',
            // Include any additional fields that might be useful
            ...(paper.x !== undefined && { x: paper.x }),
            ...(paper.y !== undefined && { y: paper.y }),
            // Add original paper data for debugging
            _original: paper
          };
          
          // Log the formatted paper for debugging
          if (Math.random() < 0.1) { // Log about 10% of formatted papers
            console.log('Formatted paper:', formattedPaper);
          }
          
          return formattedPaper;
          
        } catch (error) {
          console.error('Error formatting paper:', {
            error: error.message,
            paper: paper,
            stack: error.stack
          });
          
          // Return a minimal valid paper object
          return {
            id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: 'Error loading paper',
            line1: 'Unknown',
            line2: 'Date: N/A',
            line3: 'There was an error loading this paper',
            line4: '#',
            categories: ['error'],
            technologies: ['error'],
            Cluster: 'Error',
            _error: error.message,
            _original: paper || {}
          };
        }
      });
      
      console.log(`Successfully formatted ${formattedItems.length} papers`);
      
      // Filter out any null/undefined papers that might have been created during errors
      const validItems = formattedItems.filter(item => item != null);
      
      // Update state with the new data (append if loading more pages)
      if (page > 1) {
        setItems(prevItems => [...prevItems, ...validItems]);
      } else {
        setItems(validItems);
      }
      
      // Always update filtered items with the current page's data
      setFilteredItems(validItems);
      
      // Update chart data with all available items (only on first page load)
      if (page === 1) {
        updateChartData(validItems);
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
        _error: error.message
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
                />
              </div>
            )}
            {activeTab === 'papers' ? (
              <>
                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Publications Over Time
                    </h2>
                    <div className="h-80">
                      <PublicationsChart 
                        data={chartData} 
                        onMonthSelect={handleMonthSelect}
                        selectedMonthIndex={selectedMonthIndex}
                      />
                    </div>
                  </div>
                  
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
                        {searchTerm ? `Search Results for "${searchTerm}"` : 'Latest Publications'}
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
                  
                  {isLoading && pagination.currentPage === 1 ? (
                    <div className="p-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading papers...</p>
                    </div>
                  ) : items.length > 0 ? (
                    <>
                      <ListSection 
                        items={items}
                        onItemClick={handlePaperSelect}
                        selectedItemId={selectedPaper?.id}
                        onCategorySelect={handleCategorySelect}
                      />
                      
                      {/* Pagination Controls */}
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
                    </>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-gray-500 dark:text-gray-400">No papers found. Try a different search term.</p>
                    </div>
                  )}
                </div>
              </>
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
            
            {/* Loading indicator for subsequent pages */}
            {isLoading && pagination.currentPage > 1 && (
              <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg flex items-center space-x-2 z-50">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Loading more papers...</span>
              </div>
            )}
          </div>
        </main>
        </div>
    </ThemeProvider>
  );
}

export default App;
