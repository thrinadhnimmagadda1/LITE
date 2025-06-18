import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';
import ListSection from './components/ListSection';
import ItemDetail from './components/ItemDetail';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Feedback from './components/Feedback';

// Define items data with technology categories
export const items = [
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

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTechnologies, setSelectedTechnologies] = useState([]);
  const [filteredItems, setFilteredItems] = useState(items);

  const handleSearch = (query) => {
    setSearchQuery(query);
    filterItems(query, selectedCategory, selectedTechnologies);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    filterItems(searchQuery, category, selectedTechnologies);
  };

  const filterItems = (query = searchQuery, category = selectedCategory, techs = selectedTechnologies) => {
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
    
    setFilteredItems(result);
  };

  const handleTechnologySelect = (tech) => {
    setSelectedTechnologies(prev => {
      const newTechs = prev.includes(tech)
        ? prev.filter(t => t !== tech) // Remove if already selected
        : [...prev, tech]; // Add if not selected
      
      filterItems(searchQuery, selectedCategory, newTechs);
      return newTechs;
    });
  };

  const clearTechnologyFilter = () => {
    setSelectedTechnologies([]);
    filterItems(searchQuery, selectedCategory, []);
  };

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
          <Header onSearch={handleSearch} onCategorySelect={handleCategorySelect} />
          <main className="flex flex-col md:flex-row">
            {/* Sidebar on the left */}
            <div className="w-full md:w-1/4 lg:w-1/5 p-4">
              <Sidebar 
                onTechnologySelect={handleTechnologySelect}
                selectedTechnologies={selectedTechnologies}
                onClearFilter={clearTechnologyFilter}
              />
            </div>
            
            {/* Main content area */}
            <div className="w-full md:w-3/4 lg:w-4/5 p-4">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <ListSection 
                      items={filteredItems}
                      onCategorySelect={handleCategorySelect}
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
                {/* Add a catch-all route to redirect to home if path doesn't match */}
                <Route 
                  path="*" 
                  element={
                    <ListSection 
                      items={filteredItems}
                      onCategorySelect={handleCategorySelect}
                    />
                  } 
                />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
