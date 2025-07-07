import React, { useState, useEffect, useCallback } from 'react';
import { fetchPapers } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import PublicationsChart from './components/PublicationsChart';
import ClustersChart from './components/ClustersChart';
import ListSection from './components/ListSection';
import Header from './components/Header';
import './App.css';

function App() {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  // Load papers data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const papers = await fetchPapers();
        
        if (!papers || !Array.isArray(papers)) {
          throw new Error('Invalid data format received from API');
        }
        
        const formattedItems = papers.map(paper => ({
          id: paper.id,
          title: paper.Title || 'Untitled',
          line1: paper.Authors || 'Unknown Author',
          line2: `Date: ${paper['Published Date'] || 'N/A'}`,
          line3: paper.Abstract || 'No abstract available',
          line4: paper.URL || '#',
          categories: paper.Categories ? paper.Categories.split(';').map(cat => cat.trim()) : []
        }));
        
        setItems(formattedItems);
        setFilteredItems(formattedItems);
        updateChartData(formattedItems);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Update chart data when items change
  const updateChartData = useCallback((items) => {
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
          if (!item.line2) return false;
          const dateStr = item.line2.replace('Date: ', '').trim();
          const paperDate = new Date(dateStr);
          return paperDate.getFullYear() === year && 
                 paperDate.getMonth() === month;
        }).length;
        
        papersCount.push(count);
      }
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
  }, []);

  // Handle search submission
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setFilteredItems([...items]);
      setIsSearching(false);
      setSelectedMonthIndex(null);
      return;
    }
    
    const lowerQuery = searchTerm.toLowerCase();
    const results = items.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) ||
      item.line1.toLowerCase().includes(lowerQuery) ||
      item.line3.toLowerCase().includes(lowerQuery) ||
      (item.categories && item.categories.some(cat => 
        cat.toLowerCase().includes(lowerQuery)
      ))
    );
    
    setFilteredItems(results);
    setIsSearching(true);
  }, [items, searchTerm]);

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Header 
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
          onSearchSubmit={handleSearch}
          onClearSearch={clearSearch}
        />
        
        <main className="w-full max-w-full px-0 py-8">
          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mx-4">
            {/* Publication Timeline Chart */}
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

            {/* Research Categories Chart */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Research Categories</h2>
              <ClustersChart items={isSearching ? filteredItems : items} />
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Showing top 10 categories from {isSearching ? 'filtered' : 'all'} papers
              </div>
            </section>
          </div>
          
          {/* Papers List */}
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
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
