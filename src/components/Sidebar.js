import React, { useState, useEffect } from 'react';
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
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Sidebar = ({ onTechnologySelect, selectedTechnologies = [], onClearFilter }) => {
  const [feedback, setFeedback] = useState({
    name: '',
    email: '',
    message: '',
    rating: 0
  });
  
  const [chartOptions, setChartOptions] = useState({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#6B7280',
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#6B7280',
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#6B7280',
        }
      }
    }
  });

  // List of available technology stacks
  const technologies = [
    'Technology1', 'Technology2', 'Technology3', 'Technology4',
    'Technology5', 'Technology6', 'Technology7', 'Technology8'
  ];

  const handleTechnologyClick = (tech) => {
    onTechnologySelect(tech);
  
  };

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Engagement',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const [submitted, setSubmitted] = useState(false);

  // Update chart options when dark mode changes
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setChartOptions(prevOptions => ({
      ...prevOptions,
      plugins: {
        ...prevOptions.plugins,
        legend: {
          ...prevOptions.plugins?.legend,
          labels: {
            color: isDark ? '#9CA3AF' : '#6B7280',
          }
        },
      },
      scales: {
        ...prevOptions.scales,
        y: {
          ...prevOptions.scales?.y,
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            color: isDark ? '#9CA3AF' : '#6B7280',
          }
        },
        x: {
          ...prevOptions.scales?.x,
          grid: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            color: isDark ? '#9CA3AF' : '#6B7280',
          }
        }
      }
    }));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFeedback(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingClick = (rating) => {
    setFeedback(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Feedback submitted:', feedback);
    setSubmitted(true);
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFeedback({
        name: '',
        email: '',
        message: '',
        rating: 0
      });
    }, 3000);
  };

  return (
    <div className="w-full h-full space-y-6">
      {/* Technology Stacks */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-6 transition-all duration-300 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Technology Stacks</h3>
          {selectedTechnologies.length > 0 && (
            <button 
              onClick={onClearFilter}
              className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 transition-colors"
            >
              Clear All ({selectedTechnologies.length})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {technologies.map((tech, index) => (
            <button
              key={index}
              onClick={() => handleTechnologyClick(tech)}
              className={`px-4 py-3 rounded-lg transition-all shadow-sm ${
                selectedTechnologies.includes(tech)
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-200 dark:shadow-indigo-800 transform -translate-y-0.5'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 hover:border-indigo-200 dark:hover:border-indigo-500/50'
              }`}
            >
              <span className="font-medium text-sm">{tech}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Engagement Metrics */}
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
                legend: {
                  display: false
                },
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
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  },
                  ticks: {
                    color: '#6B7280',
                    font: {
                      size: 12
                    }
                  }
                },
                x: {
                  ...chartOptions.scales.x,
                  grid: {
                    display: false
                  },
                  ticks: {
                    color: '#6B7280',
                    font: {
                      size: 12
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
