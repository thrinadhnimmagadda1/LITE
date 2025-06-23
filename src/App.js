import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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

// Sample data for the application
const items = [
  {
    id: 1,
    title: 'Item 1 - Advanced Machine Learning',
    line1: 'John Doe',
    line2: 'Date: 2023-01-15',
    line3: 'Abstract: This paper explores advanced techniques in machine learning and their applications...',
    line4: 'https://arxiv.org/abs/2206.00001',
    technologies: ["Large language models", "LLMs", "GPT", "BERT", "transformers"],
    secondaryTechnologies: ['Neural Networks', 'Supervised Learning', 'Reinforcement Learning']
  },
  {
    id: 2,
    title: 'Item 2 - Blockchain Revolution',
    line1: 'Jane Smith',
    line2: 'Date: 2023-02-20',
    line3: 'Abstract: Understanding the impact of blockchain technology on modern finance...',
    line4: 'https://arxiv.org/abs/2206.00002',
    technologies: ["BERT", "transformers"],
    secondaryTechnologies: ['Smart Contracts', 'Ethereum', 'Solidity', 'DeFi']
  },
  {
    id: 3,
    title: 'Item 3 - Quantum Computing Basics',
    line1: 'Alice Johnson',
    line2: 'Date: 2023-03-10',
    line3: 'Abstract: An introduction to quantum computing principles and qubits...',
    line4: 'https://arxiv.org/abs/2206.00003',
    technologies: ["Large language models", "LLMs", "GPT"],
    secondaryTechnologies: ['Quantum Gates', 'Quantum Algorithms', 'Superposition']
  },
  {
    id: 4,
    title: 'Item 4 - The Future of AI',
    line1: 'Bob Williams',
    line2: 'Date: 2023-03-25',
    line3: 'Abstract: Exploring the future possibilities and ethical considerations of AI...',
    line4: 'https://arxiv.org/abs/2206.00004',
    technologies: ["LLMs", "GPT"],
    secondaryTechnologies: ['Neural Networks', 'Deep Learning', 'AI Safety']
  },
  {
    id: 5,
    title: 'Item 5 - Quantum Computing Fundamentals',
    line1: 'Michael Brown',
    line2: 'Date: 2023-04-05',
    line3: 'Abstract: Introduction to quantum computing principles and their implications for the future.',
    line4: 'https://arxiv.org/abs/2206.00005',
    technologies: ["Large language models", "LLMs", "GPT"],
    secondaryTechnologies: ['Quantum Supremacy', 'Quantum Hardware', 'Quantum Software']
  }
];

function App() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrimaryTech, setSelectedPrimaryTech] = useState('');
  const [selectedSecondaryTech, setSelectedSecondaryTech] = useState('');
  const [filteredItems, setFilteredItems] = useState([...items]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  // Initialize chart data
  useEffect(() => {
    // Generate sample data for the chart
    const days = 30;
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - days);
    
    const labels = Array.from({ length: days }, (_, i) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const generateData = (min, max, volatility) => {
      let lastValue = (min + max) / 2;
      return Array.from({ length: days }, () => {
        const changePercent = (Math.random() * 2 - 1) * volatility;
        lastValue = Math.max(min, Math.min(max, lastValue * (1 + changePercent)));
        return Math.round(lastValue * 10) / 10;
      });
    };

    setChartData({
      labels,
      datasets: [
        {
          label: 'Searches',
          data: generateData(50, 200, 0.1),
          borderColor: 'rgba(79, 70, 229, 1)',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 0
        },
        {
          label: 'Views',
          data: generateData(30, 150, 0.15),
          borderColor: 'rgba(168, 85, 247, 1)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 0
        }
      ]
    });
  }, []);

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
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6
        }
      },
      y: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#9CA3AF',
          callback: function(value) {
            return value;
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2
      }
    }
  };

  // Update recent searches
  const updateRecentSearches = (query) => {
    if (!query.trim()) return;
    
    setRecentSearches(prev => {
      const updatedSearches = prev.filter(item => item.query !== query);
      return [
        { query, timestamp: new Date().toISOString() },
        ...updatedSearches.slice(0, 4) // Keep only the 5 most recent
      ];
    });
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const searchTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - searchTime) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Get all unique primary and secondary technologies for filters
  const allPrimaryTechnologies = [...new Set(items.flatMap(item => item.technologies || []))].sort();
  const allSecondaryTechnologies = [...new Set(items.flatMap(item => item.secondaryTechnologies || []))].sort();

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    // Update recent searches
    if (searchTerm.trim()) {
      updateRecentSearches(searchTerm);
    }
    
    // Apply filters and search
    let results = [...items];
    
    if (searchTerm) {
      const lowerQuery = searchTerm.toLowerCase();
      results = results.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        item.line1.toLowerCase().includes(lowerQuery) ||
        item.line3.toLowerCase().includes(lowerQuery) ||
        (item.technologies && item.technologies.some(tech => 
          tech.toLowerCase().includes(lowerQuery)
        )) ||
        (item.secondaryTechnologies && item.secondaryTechnologies.some(tech => 
          tech.toLowerCase().includes(lowerQuery)
        ))
      );
    }

    if (selectedPrimaryTech) {
      results = results.filter(item => 
        item.technologies && item.technologies.includes(selectedPrimaryTech)
      );
    }

    if (selectedSecondaryTech) {
      results = results.filter(item => 
        item.secondaryTechnologies && item.secondaryTechnologies.includes(selectedSecondaryTech)
      );
    }

    setFilteredItems(results);
  };

  const clearFilters = () => {
    setSelectedPrimaryTech('');
    setSelectedSecondaryTech('');
    setSearchTerm('');
    setFilteredItems([...items]);
  };

  const location = useLocation();
  
  // Check if we're on the home page to conditionally render the main content
  const isHomePage = location.pathname === '/';

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Header 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearchSubmit={handleSearch}
          allPrimaryTechnologies={allPrimaryTechnologies}
          selectedPrimaryTech={selectedPrimaryTech}
          onPrimaryTechChange={setSelectedPrimaryTech}
          allSecondaryTechnologies={allSecondaryTechnologies}
          selectedSecondaryTech={selectedSecondaryTech}
          onSecondaryTechChange={setSelectedSecondaryTech}
          onClearFilters={() => {
            setSearchTerm('');
            setSelectedPrimaryTech('');
            setSelectedSecondaryTech('');
            setFilteredItems([...items]);
            setIsSearching(false);
            navigate('/');
          }}
        />
        
        <Routes>
          <Route path="/" element={
            <div>
              <main className="container mx-auto px-4 py-6">
                {/* Compact Graph Section at Top */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Search Analytics</h2>
                  <div className="h-40">
                    <Line data={chartData} options={{
                      ...chartOptions,
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        ...chartOptions.scales,
                        x: {
                          ...chartOptions.scales?.x,
                          grid: {
                            display: false
                          },
                          ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 6
                          }
                        },
                        y: {
                          ...chartOptions.scales?.y,
                          grid: {
                            display: false
                          },
                          ticks: {
                            maxTicks: 5
                          }
                        }
                      }
                    }} />
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Column - Main Content */}
                  <div className="flex-1">
                    {!isSearching ? (
                      <div className="text-center py-12">
                        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">Research Paper Explorer</h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300">
                          Use the search and filters above to find research papers
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {filteredItems.length > 0 ? (
                          <div>
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
                              {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'} found
                            </h2>
                            <div className="space-y-6">
                              {filteredItems.map((item) => (
                                <div 
                                  key={item.id} 
                                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                                  onClick={() => navigate(`/item/${item.id}`)}
                                >
                                  <div className="p-6">
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                                      {item.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                                      {item.line1} • {new Date(item.line2.replace('Date : ', '')).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </p>
                                    <p className="text-gray-700 dark:text-gray-200 mb-4 line-clamp-2">
                                      {item.line3}
                                    </p>
                                    
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {item.technologies?.map((tech, idx) => (
                                        <span 
                                          key={`${item.id}-tech-${idx}`}
                                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100"
                                        >
                                          {tech}
                                        </span>
                                      ))}
                                    </div>
                                    
                                    {item.secondaryTechnologies && item.secondaryTechnologies.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {item.secondaryTechnologies.map((tech, idx) => (
                                          <span 
                                            key={`${item.id}-sectech-${idx}`}
                                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-700"
                                          >
                                            {tech}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">No results found</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                              Try adjusting your search or filter criteria
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column - Recent Searches */}
                  <div className="lg:w-80 flex-shrink-0">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sticky top-24">
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Recent Searches</h2>
                      {recentSearches.length > 0 ? (
                        <div className="space-y-3">
                          {recentSearches.map((search, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setSearchTerm(search.query);
                                const results = items.filter(item => 
                                  item.title.toLowerCase().includes(search.query.toLowerCase()) ||
                                  item.line1.toLowerCase().includes(search.query.toLowerCase()) ||
                                  item.line3.toLowerCase().includes(search.query.toLowerCase()) ||
                                  (item.technologies && item.technologies.some(t => 
                                    t.toLowerCase().includes(search.query.toLowerCase())
                                  ))
                                );
                                setFilteredItems(results);
                                setIsSearching(true);
                              }}
                              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-between"
                            >
                              <span className="truncate">{search.query}</span>
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatTimeAgo(search.timestamp)}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Your recent searches will appear here
                        </p>
                      )}
                    </div>
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
