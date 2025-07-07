import React, { useCallback, useRef, useEffect } from 'react';
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

const PublicationsChart = ({ 
  data, 
  onMonthSelect, 
  selectedMonthIndex,
  onClearSelection 
}) => {
  const chartRef = useRef(null);

  const handleClick = useCallback((event) => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const points = chart.getElementsAtEventForMode(
      event,
      'nearest',
      { intersect: false },
      false
    );

    if (points && points.length > 0) {
      const clickedIndex = points[0].index;
      // Only call onMonthSelect if clicking a different month
      if (clickedIndex !== selectedMonthIndex) {
        onMonthSelect(clickedIndex);
      }
    } else if (selectedMonthIndex !== null) {
      // Only clear if we have a selection
      onClearSelection();
    }
  }, [onMonthSelect, onClearSelection, selectedMonthIndex]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest',
      intersect: false,
      axis: 'x'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false
      }
    },
    elements: {
      point: {
        radius: (context) => {
          return context.dataIndex === selectedMonthIndex ? 10 : 4;
        },
        backgroundColor: (context) => {
          return context.dataIndex === selectedMonthIndex ? '#EF4444' : '#3B82F6';
        },
        borderColor: (context) => {
          return context.dataIndex === selectedMonthIndex ? '#EF4444' : '#3B82F6';
        },
        hoverRadius: (context) => {
          return context.dataIndex === selectedMonthIndex ? 12 : 6;
        },
        borderWidth: (context) => {
          return context.dataIndex === selectedMonthIndex ? 3 : 2;
        },
        hoverBorderWidth: (context) => {
          return context.dataIndex === selectedMonthIndex ? 4 : 3;
        },
        hitRadius: 15,
        hoverBorderColor: '#EF4444',
        hoverBackgroundColor: (context) => {
          return context.dataIndex === selectedMonthIndex ? '#EF4444' : '#3B82F6';
        }
      },
      line: {
        borderWidth: 2,
        tension: 0.1,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)'
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 12
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    },
    onClick: handleClick
  };

  return (
    <div className="h-64 w-full">
      <Line 
        ref={chartRef}
        data={data} 
        options={options} 
      />
    </div>
  );
};

export default PublicationsChart;
