import React, { useState, useEffect, useCallback } from 'react';
import { fetchPapers, updateSearchTerms } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import PublicationsChart from './components/PublicationsChart';
import ClustersChart from './components/ClustersChart';
import ListSection from './components/ListSection';
import SearchPage from './components/SearchPage';
import Header from './components/Header';
import './App.css';

function App() {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
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
      searchValue = inputElement ? inputElement.value : searchValue;
    }
    
    if (!searchValue.trim()) return;
    
    setHasSearched(true);
    setIsLoading(true);
    setSearchTerm(searchValue);
    
    try {
      // Call the backend API to update search terms
      await updateSearchTerms(searchValue);
      
      // Fetch the updated papers
      const papers = await fetchPapers();
      setItems(papers);
      setFilteredItems(papers);
      
      // Update chart data
      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = new Date().getFullYear();
      const counts = Array(12).fill(0);
      
      papers.forEach(paper => {
        if (paper.published_date) {
          const date = new Date(paper.published_date);
          if (date.getFullYear() === currentYear) {
            counts[date.getMonth()]++;
          }
        }
      });
      
      setChartData({
        labels,
        datasets: [
          {
            label: 'Publications',
            data: counts,
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1,
          },
        ],
      });
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsLoading(false);
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
      
      try {
        // First update the search terms in the backend
        const response = await updateSearchTerms(query);
        console.log('Backend update response:', response);
        
        // Handle different response formats
        if (response.warning) {
          console.warn('Warning from backend:', response.warning);
          alert(response.warning);
          return;
        }
        
        // Poll for new results with retries
        const maxRetries = 5;
        let retryCount = 0;
        let papers = [];
        
        while (retryCount < maxRetries) {
          try {
            console.log(`Fetching papers (attempt ${retryCount + 1}/${maxRetries})...`);
            const data = await fetchPapers();
            console.log('Fetched papers data:', data);
            
            // Handle different response formats
            papers = Array.isArray(data) ? data : (data.papers || []);
            
            if (papers.length > 0) {
              console.log(`Found ${papers.length} papers`);
              break; // Exit the retry loop if we got papers
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
            retryCount++;
          } catch (fetchError) {
            console.error(`Error fetching papers (attempt ${retryCount + 1}):`, fetchError);
            if (retryCount >= maxRetries - 1) throw fetchError;
            await new Promise(resolve => setTimeout(resolve, 2000));
            retryCount++;
          }
        }
        
        if (papers.length === 0) {
          throw new Error('No papers found matching your search criteria');
        }
        
        // Update state with the new papers
        setItems(papers);
        setFilteredItems(papers);
        updateChartData(papers);
        
      } catch (error) {
        console.error('Search error:', error);
        alert(`Search error: ${error.message}`);
      }
      
    } catch (error) {
      console.error('Search processing error:', error);
      alert(`Error processing search: ${error.message}`);
    } finally {
      setIsSearching(false);
      
      // Force a re-render by updating a dummy state
      setItems(prevItems => [...prevItems]);
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
          searchTerm={searchTerm} 
          onSearch={handleSearch} 
          onSearchTermChange={setSearchTerm}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="sticky top-0 z-10"
          showBackButton={true}
          onBack={() => setHasSearched(false)}
        />
        
        <main className="container mx-auto px-4 py-6">
          <div className="space-y-8">
            {activeTab === 'papers' && (
              <>
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
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Research Papers
                    </h2>
                  </div>
                  {filteredItems && Array.isArray(filteredItems) && filteredItems.length > 0 ? (
                    <ListSection 
                      items={filteredItems} 
                      onCategorySelect={handleCategorySelect}
                      onItemClick={handlePaperSelect}
                      key={`list-section-${filteredItems.length}-${Date.now()}`}
                    />
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        No papers found. Try a different search term.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {activeTab === 'clusters' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    Paper Clusters
                  </h2>
                  <div className="h-[600px]">
                    <ClustersChart 
                      papers={items} 
                      onPaperSelect={handlePaperSelect}
                      expandedView={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
