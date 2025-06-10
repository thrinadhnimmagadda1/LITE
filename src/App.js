import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ListSection from './components/ListSection';
import ItemDetail from './components/ItemDetail';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Define items data outside the component so it can be exported and imported elsewhere
export const items = [
  {
    id: 1,
    title: 'Item 1 - Main Title',
    line1: 'Authors',
    line2: 'Date',
    line3: 'Abstract',
    line4: 'https://arxiv.org/abs/2206.00001'
  },
  {
    id: 2,
    title: 'Item 2 - Main Title',
    line1: 'Authors',
    line2: 'Date',
    line3: 'Abstract',
    line4: 'https://arxiv.org/abs/2206.00001'
  },
  {
    id: 3,
    title: 'Item 3 - Main Title',
    line1: 'Authors',
    line2: 'Date',
    line3: 'Abstract',
    line4: 'https://arxiv.org/abs/2206.00001'
  },
  {
    id: 4,
    title: 'Item 4 - Main Title',
    line1: 'Authors',
    line2: 'Date',
    line3: 'Abstract',
    line4: 'https://arxiv.org/abs/2206.00001'
  },
  {
    id: 5,
    title: 'Item 5 - Main Title',
    line1: 'Authors',
    line2: 'Date',
    line3: 'Abstract',
    line4: 'https://arxiv.org/abs/2206.00001'
  }
];

function App() {
  const handleSearch = (searchQuery) => {
    console.log('Searching for:', searchQuery);
    // Here you would typically filter your items based on the search query
    // If you need to filter the 'items' array for display within App, 
    // you might want to use a state variable initialized with this 'items' data.
  };

  const handleCategorySelect = (category) => {
    console.log('Selected category:', category);
    // Here you would typically filter items by the selected category
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
                    items={items}
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
