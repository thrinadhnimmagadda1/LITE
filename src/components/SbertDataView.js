import React, { useState, useEffect } from 'react';
import { getSbertData } from '../services/sbertService';

const SbertDataView = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getSbertData();
        setData(result);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch SBERT data');
        setLoading(false);
        console.error(err);
      }
    };

    fetchData();
  }, []);

  // Get unique clusters for filter
  const clusters = [...new Set(data.map(item => item.Cluster))];

  // Filter data based on search term and selected cluster
  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.Title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Abstract?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Authors?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCluster = selectedCluster ? item.Cluster === selectedCluster : true;
    
    return matchesSearch && matchesCluster;
  });

  if (loading) return <div className="p-4">Loading SBERT data...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SBERT Data Explorer</h1>
      
      {/* Search and Filter */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by title, abstract, or authors..."
            className="w-full p-2 border rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <select
            className="w-full p-2 border rounded"
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
          >
            <option value="">All Clusters</option>
            {clusters.map((cluster, index) => (
              <option key={index} value={cluster}>
                {cluster || 'Uncategorized'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredData.length} of {data.length} papers
      </div>

      {/* Data Grid */}
      <div className="space-y-6">
        {filteredData.map((item, index) => (
          <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-blue-700 mb-1">{item.Title}</h2>
            {item.Authors && (
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Authors:</span> {item.Authors}
              </p>
            )}
            {item.Cluster && (
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-2">
                {item.Cluster}
              </span>
            )}
            {item.Abstract && (
              <div className="mt-2">
                <p className="font-medium mb-1">Abstract:</p>
                <p className="text-gray-700 text-sm line-clamp-3">
                  {item.Abstract}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No papers found matching your criteria
        </div>
      )}
    </div>
  );
};

export default SbertDataView;
