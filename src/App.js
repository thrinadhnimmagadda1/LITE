import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { fetchPapers } from './services/api';
import { ThemeProvider } from './context/ThemeContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './App.css';
import Header from './components/Header';
import ItemDetail from './components/ItemDetail';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Fetching papers from API...');
        const papers = await fetchPapers();
        console.log('Received papers:', papers.length);
        
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
        
        console.log('Formatted items:', formattedItems.length);
        setItems(formattedItems);
        setFilteredItems(formattedItems);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response
        });
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const updateChartData = useCallback((items) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Create labels for the last 3 years, month by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [];
    const papersPerMonth = [];
    
    // Initialize data for the last 3 years of months
    for (let year = currentYear - 2; year <= currentYear; year++) {
      const startMonth = (year === currentYear - 2) ? 0 : 0; // Start from January for all years
      const endMonth = (year === currentYear) ? currentMonth : 11; // Current month for current year, else December
      
      for (let month = startMonth; month <= endMonth; month++) {
        labels.push(`${monthNames[month]} ${year}`);
        papersPerMonth.push(0);
      }
    }
    
    // Count papers per month
    items.forEach(item => {
      if (item.line2) {
        const dateStr = item.line2.replace('Date: ', '').trim();
        const paperDate = new Date(dateStr);
        if (!isNaN(paperDate.getTime())) {
          const paperYear = paperDate.getFullYear();
          const paperMonth = paperDate.getMonth();
          
          // Only count if within our 3-year window
          if (paperYear >= currentYear - 2 && paperYear <= currentYear) {
            // Find the index in our labels array
            const yearOffset = paperYear - (currentYear - 2);
            const monthIndex = paperMonth + 
              (paperYear > currentYear - 2 ? 12 * (paperYear - (currentYear - 2)) : 0);
            
            if (monthIndex >= 0 && monthIndex < papersPerMonth.length) {
              papersPerMonth[monthIndex]++;
            }
          }
        }
      }
    });
    
    setChartData({
      labels,
      datasets: [
        {
          label: 'Papers Published',
          data: papersPerMonth,
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    });
  }, []);

  // Initialize chart data when items change
  useEffect(() => {
    if (items.length > 0) {
      updateChartData(items);
      setFilteredItems([...items]);
      setIsSearching(false);
    }
  }, [items, updateChartData]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9CA3AF',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#F3F4F6',
        bodyColor: '#E5E7EB',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#9CA3AF',
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 24
        },
        title: {
          display: true,
          text: 'Month / Year',
          color: '#9CA3AF'
        }
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#9CA3AF',
          precision: 0,
          stepSize: 1
        },
        title: {
          display: true,
          text: 'Number of Papers',
          color: '#9CA3AF'
        },
        min: 0
      }
    },
    elements: {
      line: {
        borderWidth: 2,
        tension: 0.1
      },
      point: {
        radius: 2,
        hoverRadius: 5,
        hoverBorderWidth: 2
      }
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setFilteredItems([...items]);
      setIsSearching(false);
      return;
    }
    const lowerQuery = searchTerm.toLowerCase();
    const results = items.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      (item.line1 && item.line1.toLowerCase().includes(lowerQuery)) ||
      (item.line3 && item.line3.toLowerCase().includes(lowerQuery)) ||
      (item.categories && item.categories.some(cat =>
        cat.toLowerCase().includes(lowerQuery)
      ))
    );
    setFilteredItems(results);
    setIsSearching(true);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setFilteredItems([...items]);
    setIsSearching(false);
  };

  const isHomePage = location.pathname === '/';
  
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
          onSearchChange={setSearchTerm}
          onSearchSubmit={handleSearch}
          onClearSearch={clearSearch}
        />
        
        <Routes>
          <Route path="/" element={
            <div>
              <main className="container mx-auto px-4 py-6">
                {/* Graph Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Paper Publications</h2>
                  <div className="h-64">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>

                {/* Papers List */}
                <div className="w-full">
                  <div className="flex-1">
                    {isSearching && filteredItems.length === 0 ? (
                      <div className="text-center py-12">
                        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No papers found</h2>
                        <p className="text-gray-500 dark:text-gray-400">
                          Try different search terms
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredItems.map((item) => (
                          <div 
                            key={item.id}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer"
                            onClick={() => navigate(`/item/${item.id}`)}
                          >
                            <div className="p-4">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{item.title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {item.line1} • {item.line2}
                              </p>
                              <p className="mt-2 text-gray-600 dark:text-gray-300 line-clamp-2">
                                {item.line3}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </main>
              
              <footer className="bg-white dark:bg-gray-800 shadow-inner py-4 mt-8">
                <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
                  <p>© {new Date().getFullYear()} Research Paper Explorer. All rights reserved.</p>
                </div>
              </footer>
            </div>
          } />
          
          <Route path="/item/:id" element={
            <div className="container mx-auto px-4 py-6">
              <ItemDetail items={items} />
            </div>
          } />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
