import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { fetchPapers, updateSearchTerms } from './services/api';
import { API_ENDPOINTS } from './config';
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
import { useLogs } from './context/LogsContext';
import LiveLogs from './components/LiveLogs';
import { LogsProvider } from './context/LogsContext';
import LiveSearchLogs from './components/LiveSearchLogs';

function App() {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [headerOptionalKeywords, setHeaderOptionalKeywords] = useState('');
  const [showHeaderKeywords, setShowHeaderKeywords] = useState(false);
  
  // Get search context
  const { currentSearch, setCurrentSearch, addToHistory } = useSearch();
  const { addLog } = useLogs();
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

  // Total available papers from ArXiv
  const [totalAvailableFromArxiv, setTotalAvailableFromArxiv] = useState(0); // Will be updated dynamically

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
    
    addLog({
      type: 'info',
      message: `Loading papers - Page ${page}, Size ${pageSize}`,
      details: { page, pageSize, forceRefresh }
    });
    
    // If we have cached data and not forcing refresh, use it
    if (papersCache[cacheKey] && !forceRefresh) {
      const { papers, pagination } = papersCache[cacheKey];
      console.log(`[loadPapers] Using cached data for key: ${cacheKey}, Papers count: ${papers.length}`);
      
      addLog({
        type: 'success',
        message: `Using cached data - ${papers.length} papers loaded`,
        details: { cacheKey, papersCount: papers.length }
      });
      
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
    addLog({
      type: 'info',
      message: 'Fetching fresh data from API...',
      details: { page, pageSize }
    });
    
    setIsLoading(true);
    
    try {
      const data = await fetchPapers({ page, pageSize });
      console.log('[loadPapers] Fetched data from API:', {
        papersCount: data.papers?.length || 0,
        pagination: data.pagination
      });
      
      addLog({
        type: 'success',
        message: `API response received - ${data.papers?.length || 0} papers`,
        details: { papersCount: data.papers?.length || 0, pagination: data.pagination }
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
      
      // Update pagination state with the response data
      if (data.pagination) {
        setPagination({
          currentPage: data.pagination.current_page || data.pagination.currentPage || page,
          pageSize: data.pagination.page_size || data.pagination.pageSize || pageSize,
          totalPages: data.pagination.total_pages || data.pagination.totalPages || 1,
          totalItems: data.pagination.total_items || data.pagination.totalItems || validItems.length,
          hasNext: data.pagination.has_next || data.pagination.hasNext || false,
          hasPrevious: data.pagination.has_previous || data.pagination.hasPrevious || false
        });
      }

      // Update total available papers from ArXiv if provided
      if (data.pagination && data.pagination.total_available_from_arxiv) {
        setTotalAvailableFromArxiv(data.pagination.total_available_from_arxiv);
        console.log('Total available papers from ArXiv:', data.pagination.total_available_from_arxiv);
      }
      
      // Update chart data with all available items (only on first page load)
      if (page === 1) {
        try {
          // Fetch all papers for charts to show complete data
          fetchAllPapersForCharts();
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

  // Fetch total available papers from ArXiv logs
  const fetchTotalAvailableFromArxiv = useCallback(async () => {
    try {
      // Get the total from the papers API
      const response = await fetch(`${API_ENDPOINTS.PAPERS}?page_size=1`);
      const data = await response.json();
      
      if (data.pagination && data.pagination.total_available_from_arxiv) {
        setTotalAvailableFromArxiv(data.pagination.total_available_from_arxiv);
        console.log('Total available papers from ArXiv:', data.pagination.total_available_from_arxiv);
      }
    } catch (error) {
      console.error('Error fetching total available papers:', error);
    }
  }, []);

  // Fetch all papers for charts to show complete data
  const fetchAllPapersForCharts = useCallback(async () => {
    try {
      addLog({
        type: 'info',
        message: 'Fetching all papers for charts',
        details: { purpose: 'chart_data' }
      });
      
      // Use a large page size to get all papers
      const response = await fetch(`${API_ENDPOINTS.PAPERS}?page_size=1000`);
      const data = await response.json();
      
      if (data.papers && data.papers.length > 0) {
        console.log(`Fetched ${data.papers.length} papers for charts`);
        
        // Debug: Log the first paper to see the actual structure
        console.log('First paper from API:', data.papers[0]);
        console.log('Available fields in first paper:', Object.keys(data.papers[0]));
        
        // Format the papers for chart data
        const formattedPapers = data.papers.map(paper => ({
          id: paper.id || `paper-${Math.random()}`,
          title: paper.title || 'Untitled',
          line1: paper.title || 'Untitled',
          line2: paper.authors || 'Unknown Authors',
          line3: paper.abstract ? paper.abstract.substring(0, 100) + '...' : 'No abstract available',
          line4: paper.url || '#',
          categories: paper.categories || [],
          technologies: paper.technologies || [],
          Cluster: paper.cluster || 'Unknown',
          // Map the date fields correctly - the API returns 'Month' and 'Year' (capitalized)
          Month: paper.Month || paper.month || null,
          Year: paper.Year || paper.year || null,
          // Also include the original data structure for fallback
          _original: paper
        }));
        
        // Debug: Log the first formatted paper
        console.log('First formatted paper:', formattedPapers[0]);
        console.log('Month/Year in first formatted paper:', {
          Month: formattedPapers[0].Month,
          Year: formattedPapers[0].Year
        });
        
        // Update chart data with all papers
        updateChartData(formattedPapers);
        
        addLog({
          type: 'success',
          message: `Charts updated with ${formattedPapers.length} papers`,
          details: { papersCount: formattedPapers.length }
        });
      }
    } catch (error) {
      console.error('Error fetching papers for charts:', error);
      addLog({
        type: 'error',
        message: 'Failed to fetch papers for charts',
        details: { error: error.message }
      });
      
      // If fetching all papers fails, we can't fallback to current page data
      // since this function is called independently. Just log the error.
      console.error('Chart data update failed completely');
    }
  }, [updateChartData, addLog]);

  // Load initial data on component mount
  useEffect(() => {
    loadPapers(1, 20);
    fetchTotalAvailableFromArxiv(); // Fetch total available papers from ArXiv
  }, []); // Removed loadPapers from deps to prevent infinite loops
  
  // Initialize header search query and optional keywords when currentSearch changes
  useEffect(() => {
    console.log('App.js: currentSearch changed:', currentSearch);
    if (currentSearch?.query) {
      console.log('App.js: Setting headerSearchQuery to:', currentSearch.query);
      setHeaderSearchQuery(currentSearch.query);
    }
    if (currentSearch?.keywords) {
      console.log('App.js: Setting headerOptionalKeywords to:', currentSearch.keywords);
      setHeaderOptionalKeywords(currentSearch.keywords);
    }
  }, [currentSearch?.query, currentSearch?.keywords]);
  
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
    
    // Add log for search initiation
    addLog({
      type: 'info',
      message: 'Search initiated',
      details: searchParams
    });
    
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
      addLog({
        type: 'error',
        message: 'Invalid search parameters',
        details: searchParams
      });
      return;
    }
    
    // Update search term state
    setSearchTerm(query);
    setHasSearched(true);
    setIsLoading(true);
    setSelectedMonthIndex(null);
    setSelectedCategory(null);
    
    addLog({
      type: 'info',
      message: `Searching for: "${query}"${keywords ? ` with keywords: ${keywords}` : ''}`,
      details: { query, keywords }
    });
    
    try {
      // Call the backend API with search parameters
      const searchPayload = {
        query: query,
        ...(keywords && { 
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean) 
        })
      };
      
      console.log('Sending search payload:', searchPayload);
      
      addLog({
        type: 'info',
        message: 'Sending search request to backend',
        details: searchPayload
      });
      
      // First update the search terms in the backend
      const response = await updateSearchTerms(searchPayload);
      console.log('Backend update response:', response);
      
      addLog({
        type: 'success',
        message: 'Search terms updated in backend',
        details: response
      });
      
      // Handle different response formats
      if (response.warning) {
        console.warn('Warning from backend:', response.warning);
        addLog({
          type: 'warning',
          message: 'Backend warning received',
          details: response.warning
        });
        alert(response.warning);
        return;
      }
      
      // Update current search in context and add to history
      const searchParams = { query, keywords };
      setCurrentSearch(searchParams);
      addToHistory(searchParams);
      
      addLog({
        type: 'info',
        message: 'Loading papers data...',
        details: { page: 1, pageSize: pagination.pageSize }
      });
      
      // Reset to first page when performing a new search
      await loadPapers(1, pagination.pageSize, searchParams);
    } catch (error) {
      console.error('Search failed:', error);
      addLog({
        type: 'error',
        message: 'Search failed',
        details: error.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, loadPapers, setCurrentSearch, addLog]);

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
  if (isLoading && hasSearched) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="w-full max-w-4xl mx-auto px-6 py-8">
          {/* Live Search Logs - Show when searching */}
          <LiveSearchLogs 
            isSearching={true}
            searchQuery={currentSearch?.query || searchTerm || ''}
            optionalKeywords={currentSearch?.keywords || optionalKeywords || ''}
          />
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <Header 
            onSearch={handleSearch}
            currentSearch={currentSearch}
            handleBackClick={() => {
              addLog({
                type: 'info',
                message: 'Navigating back to search page',
                details: { from: 'results', to: 'search' }
              });
              setHasSearched(false);
              setItems([]);
              setFilteredItems([]);
              setPagination({
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                pageSize: 20,
                hasNext: false,
                hasPrevious: false
              });
              setSelectedPaper(null);
              setActiveTab('papers');
            }}
          />
          
          {/* Compact Enhanced Search Form under Header */}
          <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-purple-50/90 backdrop-blur-sm shadow-lg border-b border-white/30">
            <div className="container mx-auto px-6 py-4">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-md border border-white/50">
                  <div className="space-y-4">
                    {/* Search Input Row */}
                    <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      {/* Search Input */}
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            placeholder="Find papers on any topic — try one word (e.g., AI, LLM)"
                            className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 text-gray-900 placeholder-gray-500 text-base shadow-sm hover:shadow-md"
                            value={headerSearchQuery}
                            onChange={(e) => setHeaderSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {/* Optional Keywords Input */}
                      <div className="flex-1 min-w-0">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            placeholder="Optional keywords (comma-separated)..."
                            className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 text-gray-900 placeholder-gray-500 text-base shadow-sm hover:shadow-md bg-purple-50/50"
                            value={headerOptionalKeywords}
                            onChange={(e) => setHeaderOptionalKeywords(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {/* Search Button */}
                      <button
                        onClick={() => {
                          if (headerSearchQuery.trim()) {
                            handleSearch({
                              query: headerSearchQuery.trim(),
                              keywords: headerOptionalKeywords.trim()
                            });
                          }
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 transform text-sm shadow-md"
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span>Search</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <main className="container mx-auto px-6 py-8">
            <div className="space-y-8">
              {activeTab === 'papers' ? (
                <div className="space-y-8">
                  {/* Enhanced Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Publications Over Time Chart */}
                    <div className="group bg-gradient-to-br from-white/95 via-blue-50/90 to-indigo-50/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 p-8 hover:shadow-3xl transition-all duration-700 hover:-translate-y-3 hover:scale-[1.03] relative overflow-hidden">
                      {/* Enhanced decorative background elements */}
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/15 via-cyan-400/10 to-indigo-400/15 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-indigo-400/15 via-purple-400/10 to-pink-400/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-cyan-400/8 to-blue-400/8 rounded-full blur-xl group-hover:scale-150 transition-transform duration-1000"></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                                                           <div>
                                   <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-700 bg-clip-text text-transparent leading-tight mb-2">
                                     Publications Over Time
                                   </h2>
                                 </div>
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="h-80 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 rounded-2xl p-4 border border-blue-100/50">
                          <PublicationsChart 
                            data={chartData}
                            onMonthSelect={handleMonthSelect}
                            selectedMonthIndex={selectedMonthIndex}
                            onClearSelection={clearMonthFilter}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Paper Clusters Chart */}
                    <div className="group bg-gradient-to-br from-white/95 via-purple-50/90 to-pink-50/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 p-8 hover:shadow-3xl transition-all duration-700 hover:-translate-y-3 hover:scale-[1.03] relative overflow-hidden">
                      {/* Enhanced decorative background elements */}
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-400/15 via-pink-400/10 to-rose-400/15 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-400/15 via-rose-400/10 to-purple-400/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-pink-400/8 to-purple-400/8 rounded-full blur-xl group-hover:scale-150 transition-transform duration-1000"></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                                                           <div>
                                   <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-700 bg-clip-text text-transparent leading-tight mb-2">
                                     Paper Clusters
                                   </h2>
                                 </div>
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                        </div>
                        <div className="h-80 bg-gradient-to-br from-purple-50/30 to-pink-50/30 rounded-2xl p-4 border border-purple-100/50">
                          <ClustersChart 
                            papers={items}
                            onPaperSelect={handlePaperSelect}
                            onCategorySelect={handleCategorySelect}
                            selectedCategory={selectedCategory}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Papers List */}
                  <div className="group bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-md rounded-3xl shadow-xl border border-white/40 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-gray-400/5 to-blue-400/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-indigo-400/5 to-purple-400/5 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>
                    
                    <div className="relative z-10">
                      <div className="px-8 py-8 border-b border-gray-200/30 bg-gradient-to-r from-gray-50/60 via-blue-50/40 to-indigo-50/60">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                          <div className="flex-1">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-blue-700 bg-clip-text text-transparent mb-3 leading-tight">
                              {searchTerm 
                                ? `Search Results for "${searchTerm.toUpperCase()}${optionalKeywords ? ` ,${optionalKeywords.toUpperCase()}` : ''}"` 
                                : 'Latest Publications'}
                            </h2>
                            <div className="flex flex-wrap items-center space-x-6 text-sm text-gray-600">
                              <span className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 rounded-full border border-green-200">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="font-medium">Showing {items.length} of {pagination.totalItems} {pagination.totalItems === 1 ? 'result' : 'results'}</span>
                              </span>
                              {!isLoading && items.length > 0 && (
                                <span className="flex items-center space-x-2 px-3 py-1.5 bg-blue-100 rounded-full border border-blue-200">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  <span className="font-medium">Page {pagination.currentPage} of {pagination.totalPages}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          
                                                    {!isLoading && items.length > 0 && (
                            <div className="px-6 py-3 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 rounded-2xl border border-indigo-200/50 shadow-lg">
                              <span className="text-lg font-bold text-indigo-700">
                                📚 {pagination.totalItems} Papers Found
                                {totalAvailableFromArxiv > 0 && (
                                  <span className="text-sm font-normal text-indigo-600 ml-2">
                                    (out of {totalAvailableFromArxiv.toLocaleString()} total available)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <ListSection 
                        items={items}
                        isLoading={isLoading && pagination.currentPage === 1}
                        onItemClick={handlePaperSelect}
                        selectedItemId={selectedPaper?.id}
                        onCategorySelect={handleCategorySelect}
                      />
                      
                      {items.length === 0 && !isLoading ? (
                      <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Papers Found</h3>
                        <p className="text-gray-500">Try a different search term or adjust your filters</p>
                      </div>
                    ) : (
                      <div className="px-8 py-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-blue-50/50">
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
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      Clusters View
                    </h2>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
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
        {/* Live Logs */}
        <LiveLogs />
      </div>
    </ThemeProvider>
  );
}

// Wrap the app with LogsProvider
function AppWrapper() {
  return (
    <LogsProvider>
      <App />
    </LogsProvider>
  );
}

export default AppWrapper;
