import React from 'react';
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
  // Count papers per category
  const categoryCounts = {};
  
  items.forEach(item => {
    if (item.categories && Array.isArray(item.categories)) {
      item.categories.forEach(category => {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
    }
  });

  // Sort categories by count (descending) and take top 10
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const chartData = {
    labels: sortedCategories.map(([category]) => category),
    datasets: [
      {
        label: 'Number of Papers',
        data: sortedCategories.map(([_, count]) => count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(199, 199, 199, 0.6)',
          'rgba(83, 102, 255, 0.6)',
          'rgba(40, 159, 64, 0.6)',
          'rgba(210, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(159, 159, 159, 1)',
          'rgba(83, 102, 255, 1)',
          'rgba(40, 159, 64, 1)',
          'rgba(210, 99, 132, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 0,
      autoPadding: false
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Top 10 Research Categories',
        font: {
          size: 16
        },
        padding: {
          bottom: 10
        }
      },
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
          padding: 5
        },
        grid: {
          drawBorder: false
        }
      },
      x: {
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45,
          padding: 0
        },
        grid: {
          display: false,
          drawBorder: false
        }
      }
    }
  };

  return (
    <div className="h-64 w-full -mx-2 px-2">
      <Bar 
        data={chartData} 
        options={options} 
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default ClustersChart;
