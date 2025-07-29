import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
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

const ClustersChart = ({ items }) => {
  // Process cluster data
  const { sortedClusters, totalPapers } = useMemo(() => {
    const counts = {};
    let total = 0;
    
    // Count papers in each cluster
    items.forEach(item => {
      // Get cluster ID, defaulting to -1 if not available
      const clusterId = item.cluster !== undefined ? item.cluster : 
                       (item.Cluster !== undefined ? item.Cluster : -1);
      
      const clusterKey = `Cluster ${clusterId}`;
      counts[clusterKey] = (counts[clusterKey] || 0) + 1;
      total++;
    });
    
    // Convert to array and sort by cluster ID
    const sorted = Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b));
    
    return {
      sortedClusters: sorted,
      totalPapers: total
    };
  }, [items]);

  // Bar chart data
  const barChartData = {
    labels: sortedClusters.map(([cluster]) => cluster),
    datasets: [
      {
        label: 'Number of Papers',
        data: sortedClusters.map(([_, count]) => count),
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1,
      },
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const count = context.parsed.y;
            const percentage = ((count / totalPapers) * 100).toFixed(1);
            return `${count} papers (${percentage}%)`;
          }
        }
      },
      title: {
        display: true,
        text: 'Papers per Cluster',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: { bottom: 15 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Papers',
          padding: { top: 0, bottom: 10 }
        },
        ticks: {
          precision: 0,
          stepSize: 1,
          padding: 5
        },
        grid: {
          drawBorder: false
        }
      },
      x: {
        title: {
          display: true,
          text: 'Cluster ID',
          padding: { top: 10, bottom: 0 }
        },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          padding: 10
        },
        grid: {
          display: false,
          drawBorder: false
        }
      }
    },
    animation: {
      duration: 1000
    }
  };



  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="h-96">
        <Bar 
          data={barChartData} 
          options={barChartOptions}
        />
      </div>
    </div>
  );
};

export default ClustersChart;
