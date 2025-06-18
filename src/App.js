import { useState, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
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
import ListSection from './components/ListSection';
import ItemDetail from './components/ItemDetail';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Feedback from './components/Feedback';

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

// Define items data with technology categories
const items = [
  {
    id: 1,
    title: 'Item 1 - Comparing credit risk estimates in the GEN-AI era',
    line1: ' Nicola Lavecchia',
    line2: 'Date : 2022-06-01',
    line3: 'Abstract: Generative AI technologies have demonstrated significant potential across diverse applications. This study provides a comparative analysis of credit score modeling techniques, contrasting traditional approaches with those leveraging generative AI. Our findings reveal that current generative AI models fall short of matching the performance of traditional methods, regardless of the integration strategy employed. These results highlight the limitations in the current capabilities of generative AI for credit risk scoring, emphasizing the need for further research and development before the possibility of applying generative AI for this specific task, or equivalent ones.',
    line4: 'https://arxiv.org/abs/2206.00001',
    technologies: ['Technology1', 'Technology2']
  },
  {
    id: 2,
    title: 'Item 2 - Advanced Machine Learning Techniques',
    line1: 'Jane Smith, John Doe',
    line2: 'Date: 2023-01-15',
    line3: 'Abstract: This paper explores advanced machine learning techniques and their applications in various domains.',
    line4: 'https://arxiv.org/abs/2206.00002',
    technologies: ['Technology1', 'Technology3']
  },
  {
    id: 3,
    title: 'Item 3 - Deep Learning in Healthcare',
    line1: 'Alex Johnson',
    line2: 'Date: 2023-02-20',
    line3: 'Abstract: Exploring the impact of deep learning in healthcare diagnostics and treatment planning.',
    line4: 'https://arxiv.org/abs/2206.00003',
    technologies: ['Technology2', 'Technology4']
  },
  {
    id: 4,
    title: 'Item 4 - Blockchain Technology Overview',
    line1: ' Sarah Williams',
    line2: 'Date: 2023-03-10',
    line3: 'Abstract: Comprehensive analysis of blockchain technology and its potential applications.',
    line4: 'https://arxiv.org/abs/2206.00004',
    technologies: ['Technology3', 'Technology5']
  },
  {
    id: 5,
    title: 'Item 5 - Quantum Computing Fundamentals',
    line1: 'Michael Brown',
    line2: 'Date: 2023-04-05',
    line3: 'Abstract: Introduction to quantum computing principles and their implications for the future.',
    line4: 'https://arxiv.org/abs/2206.00005',
    technologies: ['Technology4', 'Technology5']
  }
];

// MainContent component that uses useNavigate
const MainContent = ({ 
  filteredItems, 
  handleCategorySelect, 
  updateRecentlyRead, 
  recentlyRead, 
  chartData, 
  chartOptions 
}) => {
  const navigate = useNavigate();

  const handleItemClick = (itemId) => {
    updateRecentlyRead(itemId);
    navigate(`/item/${itemId}`);
  };

  return (
    <>
      <div className="w-full md:w-3/5 p-4">
        <Routes>
          <Route 
            path="/" 
            element={
              <ListSection 
                items={filteredItems}
                onCategorySelect={handleCategorySelect}
                onItemClick={updateRecentlyRead}
              />
            } 
          />
          <Route 
            path="/item/:id" 
            element={
              <ItemDetail 
                items={items} 
              />
            } 
          />
          <Route 
            path="/feedback" 
            element={
              <Feedback />
            } 
          />
          <Route 
            path="*" 
            element={
              <ListSection 
                items={filteredItems}
                onCategorySelect={handleCategorySelect}
                onItemClick={updateRecentlyRead}
              />
            } 
          />
        </Routes>
      </div>

      <div className="w-full md:w-1/5 p-4 space-y-6">
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-6 transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5">Evolution</h3>
          <div className="h-56">
            <Line 
              data={chartData} 
              options={{
                ...chartOptions,
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                borderColor: 'rgba(99, 102, 241, 0.8)',
                plugins: {
                  ...chartOptions.plugins,
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }
                },
                scales: {
                  ...chartOptions.scales,
                  y: {
                    ...chartOptions.scales.y,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: '#6B7280', font: { size: 12 } }
                  },
                  x: {
                    ...chartOptions.scales.x,
                    grid: { display: false },
                    ticks: { color: '#6B7280', font: { size: 12 } }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-6 transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5">Recently Read</h3>
          <div className="space-y-4">
            {recentlyRead.length > 0 ? (
              recentlyRead.map((item) => (
                <div 
                  key={`recent-${item.id}`} 
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => handleItemClick(item.id)}
                >
                  <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{item.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.line1.split(',')[0].trim()} • {item.line2.match(/\b(20\d{2})\b/)[0]}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recently viewed papers</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTechnologies, setSelectedTechnologies] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [filteredItems, setFilteredItems] = useState(items);
  const [recentlyRead, setRecentlyRead] = useState([]);
  
  const updateRecentlyRead = (itemId) => {
    setRecentlyRead(prev => {
      // Find the item that was clicked
      const itemToAdd = items.find(item => item.id === itemId);
      if (!itemToAdd) return prev;
      
      // Check if item is already in recently read
      const exists = prev.some(item => item.id === itemId);
      if (exists) {
        // If it exists, move it to the front
        return [
          itemToAdd,
          ...prev.filter(item => item.id !== itemId)
        ].slice(0, 3);
      }
      
      // Add new item to the beginning and keep only last 3
      return [itemToAdd, ...prev].slice(0, 3);
    });
  };
  
  // Chart data and options
  const chartData = useMemo(() => ({
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: 'Engagement',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 100)),
        borderColor: 'rgba(99, 102, 241, 0.8)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointHoverBorderColor: '#fff',
        pointHitRadius: 10,
        pointBorderWidth: 2,
        pointRadius: 3,
      },
    ],
  }), []);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          drawBorder: false,
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
    },
  }), []);
  
  // Extract unique years from items
  const allYears = [...new Set(items.map(item => {
    const yearMatch = item.line2.match(/\b(20\d{2})\b/);
    return yearMatch ? yearMatch[1] : null;
  }).filter(Boolean))].sort((a, b) => b - a); // Sort years in descending order

  const handleSearch = (query) => {
    setSearchQuery(query);
    filterItems(query, selectedCategory, selectedTechnologies, selectedYears);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    filterItems(searchQuery, category, selectedTechnologies, selectedYears);
  };

  const filterItems = (query = searchQuery, category = selectedCategory, techs = selectedTechnologies, years = selectedYears) => {
    let result = [...items];
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        item.line1.toLowerCase().includes(lowerQuery) ||
        item.line3.toLowerCase().includes(lowerQuery)
      );
    }
    
    if (category) {
      result = result.filter(item => 
        item.technologies && item.technologies.includes(category)
      );
    }

    if (techs.length > 0) {
      result = result.filter(item => 
        item.technologies && techs.some(tech => item.technologies.includes(tech))
      );
    }

    if (years.length > 0) {
      result = result.filter(item => {
        const yearMatch = item.line2.match(/\b(20\d{2})\b/);
        return yearMatch && years.includes(yearMatch[1]);
      });
    }
    
    setFilteredItems(result);
  };

  const handleTechnologySelect = (tech) => {
    setSelectedTechnologies(prev => {
      const newTechs = prev.includes(tech)
        ? prev.filter(t => t !== tech)
        : [...prev, tech];
      
      filterItems(searchQuery, selectedCategory, newTechs, selectedYears);
      return newTechs;
    });
  };

  const handleYearSelect = (year) => {
    setSelectedYears(prev => {
      const newYears = prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year];
      
      filterItems(searchQuery, selectedCategory, selectedTechnologies, newYears);
      return newYears;
    });
  };

  const clearTechnologyFilter = () => {
    setSelectedTechnologies([]);
    filterItems(searchQuery, selectedCategory, [], selectedYears);
  };

  const clearYearFilter = () => {
    setSelectedYears([]);
    filterItems(searchQuery, selectedCategory, selectedTechnologies, []);
  };

  return (
    <ThemeProvider>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
          <Header onSearch={handleSearch} onCategorySelect={handleCategorySelect} />
          <main className="flex flex-col md:flex-row">
            {/* Left Sidebar - Filters */}
            <div className="w-full md:w-1/5 p-4">
              <Sidebar 
                onTechnologySelect={handleTechnologySelect}
                selectedTechnologies={selectedTechnologies}
                onClearTechnologyFilter={clearTechnologyFilter}
                allYears={allYears}
                selectedYears={selectedYears}
                onYearSelect={handleYearSelect}
                onClearYearFilter={clearYearFilter}
                showGraph={false}
              />
            </div>
            
            {/* Main content area and right sidebar */}
            <MainContent 
              filteredItems={filteredItems}
              handleCategorySelect={handleCategorySelect}
              updateRecentlyRead={updateRecentlyRead}
              recentlyRead={recentlyRead}
              chartData={chartData}
              chartOptions={chartOptions}
            />
          </main>
        </div>
    </ThemeProvider>
  );
}

export default App;
