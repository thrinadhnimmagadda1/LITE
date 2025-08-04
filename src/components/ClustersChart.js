import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ClustersChart = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{
      label: 'Papers per Cluster',
      data: [],
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate colors based on the number of clusters
  const generateColors = (count) => {
    const colors = [];
    const hueStep = 360 / Math.max(1, count);

    for (let i = 0; i < count; i++) {
      const hue = (i * hueStep) % 360;
      colors.push(`hsla(${hue}, 70%, 60%, 0.6)`);
    }

    return colors;
  };

  useEffect(() => {
    const fetchClusterData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/api/papers/');
        const papers = response.data.papers || [];
        
        // Count papers per cluster
        const clusterCounts = {};
        papers.forEach(paper => {
          const cluster = paper.cluster !== undefined ? `Cluster ${paper.cluster}` : 'Uncategorized';
          clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1;
        });

        const labels = Object.keys(clusterCounts);
        const counts = Object.values(clusterCounts);
        const backgroundColors = generateColors(labels.length);

        setChartData({
          labels,
          datasets: [{
            label: 'Papers per Cluster',
            data: counts,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
            borderWidth: 1,
            borderRadius: 4,
          }]
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching cluster data:', err);
        setError('Failed to load cluster data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchClusterData();
  }, []);

  if (loading) {
    return (
      <div className="chart-container" style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Paper Clusters</h2>
        <p>Loading cluster data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container" style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Paper Clusters</h2>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="chart-container" style={{ padding: '20px', height: '400px' }}>
      <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Paper Clusters</h2>
      {chartData.labels.length > 0 ? (
        <div style={{ height: 'calc(100% - 60px)' }}>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
                title: {
                  display: true,
                  text: 'Number of Papers per Cluster',
                  font: {
                    size: 16,
                    weight: 'bold'
                  },
                  padding: { bottom: 10 }
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.dataset.label || '';
                      const value = context.parsed.y;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = Math.round((value / total) * 100);
                      return [
                        `${label}: ${value}`,
                        `(${percentage}% of total)`
                      ];
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    precision: 0,
                    stepSize: 1
                  },
                  title: {
                    display: true,
                    text: 'Number of Papers',
                    font: {
                      weight: 'bold'
                    }
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  title: {
                    display: true,
                    text: 'Cluster Groups',
                    font: {
                      weight: 'bold'
                    }
                  },
                  grid: {
                    display: false
                  }
                }
              },
              animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
              }
            }}
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>No cluster data available. Try performing a search first.</p>
        </div>
      )}
    </div>
  );
};

export default ClustersChart;
