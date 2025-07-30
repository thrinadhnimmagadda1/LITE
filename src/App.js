import React, { useState, useEffect, useCallback } from 'react';
import { fetchPapers, updateSearchTerms } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import PublicationsChart from './components/PublicationsChart';
import ClustersChart from './components/ClustersChart';
import ListSection from './components/ListSection';
import Header from './components/Header';
import './App.css';

function App() {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('papers');
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

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

  // Function to load papers data
  const loadPapers = useCallback(async () => {
    try {
      console.log('Starting to load papers...');
      setIsLoading(true);
      
      // Clear previous data
      setItems([]);
      setFilteredItems([]);
      
      // Fetch papers and clustering data from the API
      console.log('Fetching papers and clustering data from API...');
      const response = await fetchPapers();
      
      // Check if we have a valid response with papers
      if (!response || !response.papers || !Array.isArray(response.papers)) {
        throw new Error('Invalid data format received from API');
      }
      
      // Log clustering information if available
      if (response.clustering) {
        console.log('Clustering information:', {
          available: response.clustering.available,
          sourceFile: response.clustering.sourceFile,
          numClusters: response.clustering.numClusters,
          dataPoints: response.clustering.data?.length || 0
        });
      }
      
      console.log(`Received ${response.papers.length} papers from API`);
      
      // Use clustering data if available, otherwise fall back to papers
      const dataToProcess = response.clustering?.data?.length > 0 ? response.clustering.data : response.papers;
      
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
      
      // Update state with the new data
      setItems(validItems);
      setFilteredItems(validItems);
      updateChartData(validItems);
      
      console.log('Papers loaded successfully');
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

  // Load data on component mount
  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  // Handle search submission
  const handleSearch = useCallback(async (searchValue) => {
    console.log('Search initiated with value:', searchValue);
    
    // If searchValue is an event object (from direct form submission), prevent default
    if (searchValue && typeof searchValue.preventDefault === 'function') {
      searchValue.preventDefault();
      // Get the search query from the input element
      const inputElement = searchValue.target.querySelector('input[type="text"]');
      searchValue = inputElement ? inputElement.value : '';
    }
    
    // Get the search query from the input
    const query = typeof searchValue === 'string' ? searchValue : searchValue?.target?.value || '';
    console.log('Processed search query:', query);
    
    if (!query.trim()) {
      // If search is empty, show all items
      console.log('Empty search query, showing all items');
      setFilteredItems([...items]);
      setSearchTerm('');
      return;
    }
    
    setIsSearching(true);
    setSearchTerm(query);
    
    try {
      // Show loading state
      setItems([]);
      setFilteredItems([]);
      
      console.log('Updating search terms in backend...');
      // Update search terms in the backend and process papers
      const response = await updateSearchTerms(query);
      console.log('Backend response:', response);
      
      // Handle different response formats
      if (response.warning) {
        // Handle case where no papers were found
        console.warn('Warning from backend:', response.warning);
        setItems([]);
        setFilteredItems([]);
        // You might want to show this message to the user
        alert(response.warning); // Temporary alert for debugging
        return;
      }
      
      // If we get a CSV file in the response, fetch the updated papers
      if (response.csv_file || response.papers_processed) {
        console.log('Fetching updated papers...');
        // Add a small delay to ensure the backend has time to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const data = await fetchPapers();
          console.log('Fetched papers data:', data);
          
          // Handle different response formats
          const papers = data.papers || data || [];
          
          if (papers.length === 0) {
            console.warn('No papers found in the response');
            alert('No papers found matching your search criteria');
          } else {
            console.log(`Found ${papers.length} papers`);
          }
          
          setItems(papers);
          setFilteredItems(papers);
          updateChartData(papers);
        } catch (fetchError) {
          console.error('Error fetching updated papers:', fetchError);
          alert(`Error loading papers: ${fetchError.message}`);
        }
      } else {
        console.warn('Unexpected response format from server:', response);
        alert('Unexpected response from server. Please try again.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert(`Search error: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  }, [items, searchTerm]);
  
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

  // Clear search and reset filters
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

  // Loading state
  if (isLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading papers...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        <Header 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm}
          onSearchSubmit={handleSearch}
          onClearSearch={clearSearch}
          onFilterByCluster={filterByCluster}
        />
        
        <nav className="flex justify-center mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md ${activeTab === tab.id ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'} transition-colors duration-200`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        
        <main className="w-full max-w-full px-0 py-8">
          {activeTab === 'clusters' ? (
            <ClustersChart items={isSearching ? filteredItems : items} />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mx-4">
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Publication Timeline</h2>
                    {isSearching && (
                      <button
                        onClick={clearMonthFilter}
                        className="text-sm bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-200 px-3 py-1 rounded-md flex items-center transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Show All Papers
                      </button>
                    )}
                  </div>
                  
                  <div className="h-64 w-full">
                    <PublicationsChart 
                      data={chartData}
                      selectedMonthIndex={selectedMonthIndex}
                      onMonthSelect={filterPapersByMonth}
                      onClearSelection={clearMonthFilter}
                    />
                  </div>
                  
                  {isSearching && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {filteredItems.length > 0 
                        ? `Showing ${filteredItems.length} papers from selected filter`
                        : 'No papers found matching the current filter'}
                    </div>
                  )}
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Clusters</h2>
                  <ClustersChart items={isSearching ? filteredItems : items} />
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Showing distribution of papers across {isSearching ? 'filtered' : 'all'} clusters
                  </div>
                </section>
              </div>
              
              <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                    {isSearching ? 'Filtered Papers' : 'All Papers'}
                  </h2>
                  <ListSection 
                    items={filteredItems} 
                    selectedMonthIndex={selectedMonthIndex}
                    chartData={chartData}
                  />
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
