import React, { useCallback, useRef, useMemo } from 'react';
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
import { useLogs } from '../context/LogsContext';

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
  const { addLog } = useLogs();
  
  // Month labels for logging
  const monthLabels = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

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
        const label = Array.isArray(data?.labels) ? data.labels[clickedIndex] : monthLabels[clickedIndex] || '';
        const monthName = label || monthLabels[clickedIndex];
        const value = Array.isArray(data?.datasets?.[0]?.data) ? data.datasets[0].data[clickedIndex] : undefined;
        addLog({
          type: 'info',
          message: `Month selected on chart: ${monthName}`,
          details: { monthIndex: clickedIndex, monthName, publications: value }
        });
        onMonthSelect(clickedIndex);
      }
    } else if (selectedMonthIndex !== null) {
      // Only clear if we have a selection
      addLog({
        type: 'info',
        message: 'Month selection cleared on chart',
        details: { previousMonth: monthLabels[selectedMonthIndex] }
      });
      onClearSelection();
    }
  }, [onMonthSelect, onClearSelection, selectedMonthIndex, monthLabels, data, addLog]);

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
        intersect: false,
        callbacks: {
          title: function(context) {
            // Show the full date in the tooltip
            return context[0].label;
          },
          label: function(context) {
            // Show the count of publications
            return `Publications: ${context.raw}`;
          }
        }
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
          maxTicksLimit: 12,
          maxRotation: 45,
          minRotation: 45,
          padding: 10,
          callback: function(value, index, values) {
            // Show abbreviated month and year (e.g., 'Jan 2023')
            const label = this.getLabelForValue(value);
            const [month, year] = label.split(' ');
            return `${month} '${year.slice(-2)}`;
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          stepSize: 1,
          callback: function(value) {
            if (value % 1 === 0) {
              return value;
            }
          }
        },
        title: {
          display: true,
          text: 'Number of Publications',
          padding: {top: 10, bottom: 10}
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
