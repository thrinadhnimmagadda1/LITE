import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ListSection from './components/ListSection';
import ItemDetail from './components/ItemDetail';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Define items data with technology categories
export const items = [
  {
    id: 1,
    title: 'Item 1 - Comparing credit risk estimates in the GEN-AI era',
    line1: 'Authors : Nicola Lavecchia',
    line2: 'Date : 2022-06-01',
    line3: 'Abstract: Generative AI technologies have demonstrated significant potential across diverse applications. This study provides a comparative analysis of credit score modeling techniques, contrasting traditional approaches with those leveraging generative AI. Our findings reveal that current generative AI models fall short of matching the performance of traditional methods, regardless of the integration strategy employed. These results highlight the limitations in the current capabilities of generative AI for credit risk scoring, emphasizing the need for further research and development before the possibility of applying generative AI for this specific task, or equivalent ones.',
    line4: 'https://arxiv.org/abs/2206.00001',
    technologies: ['Technology1', 'Technology2']
  },
  {
    id: 2,
    title: 'Item 2 - Advanced Machine Learning Techniques',
    line1: 'Authors: Jane Smith, John Doe',
    line2: 'Date: 2023-01-15',
    line3: 'Abstract: This paper explores advanced machine learning techniques and their applications in various domains.',
    line4: 'https://arxiv.org/abs/2206.00002',
    technologies: ['Technology1', 'Technology3']
  },
  {
    id: 3,
    title: 'Item 3 - Deep Learning in Healthcare',
    line1: 'Authors: Alex Johnson',
    line2: 'Date: 2023-02-20',
    line3: 'Abstract: Exploring the impact of deep learning in healthcare diagnostics and treatment planning.',
    line4: 'https://arxiv.org/abs/2206.00003',
    technologies: ['Technology2', 'Technology4']
  },
  {
    id: 4,
    title: 'Item 4 - Blockchain Technology Overview',
    line1: 'Authors: Sarah Williams',
    line2: 'Date: 2023-03-10',
    line3: 'Abstract: Comprehensive analysis of blockchain technology and its potential applications.',
    line4: 'https://arxiv.org/abs/2206.00004',
    technologies: ['Technology3', 'Technology5']
  },
  {
    id: 5,
    title: 'Item 5 - Quantum Computing Fundamentals',
    line1: 'Authors: Michael Brown',
    line2: 'Date: 2023-04-05',
    line3: 'Abstract: Introduction to quantum computing principles and their implications for the future.',
    line4: 'https://arxiv.org/abs/2206.00005',
    technologies: ['Technology1', 'Technology4']
  }
];

function App() {
  const [filteredItems, setFilteredItems] = useState(items);
  const [activeFilter, setActiveFilter] = useState(null);

  const handleSearch = (searchQuery) => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = items.filter(item => 
      item.title.toLowerCase().includes(lowercasedQuery) ||
      item.line1.toLowerCase().includes(lowercasedQuery) ||
      item.line3.toLowerCase().includes(lowercasedQuery)
    );
    setFilteredItems(filtered);
  };

  const handleCategorySelect = (category) => {
    if (activeFilter === category) {
      // If clicking the same category, clear the filter
      setFilteredItems(items);
      setActiveFilter(null);
    } else {
      // Filter items by the selected technology
      const filtered = items.filter(item => 
        item.technologies.includes(category)
      );
      setFilteredItems(filtered);
      setActiveFilter(category);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Header onSearch={handleSearch} onCategorySelect={handleCategorySelect} />
        <main className="flex flex-col md:flex-row">
          <div className="w-full md:w-2/3 lg:w-3/4 p-4">
            <Routes>
              <Route 
                path="/" 
                element={
                  <ListSection 
                    title="Items List"
                    items={filteredItems}
                    onCategorySelect={handleCategorySelect}
                  />
                } 
              />
              <Route path="/items/:id" element={<ItemDetail />} />
            </Routes>
          </div>
          <Sidebar />
        </main>
      </div>
    </Router>
  );
}

export default App;
