import React from 'react';
import { Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title, ChartDataLabels);

const PieChart = ({ chartData, startYear, endYear, title }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 20,
          font: { size: 16 }
        }
      },
      title: {
        display: true,
        text: title,
        font: { size: 14, weight: 'bold' }
      },
      datalabels: {
        display: (context) => {
          return context.dataset.data[context.dataIndex] > 0;
        },
        color: '#fff',
        font: {
          weight: 'bold',
          size: 13
        },
        formatter: (value, context) => {
          const total = context.chart.data.datasets[0].data
            .reduce((sum, val) => sum + val, 0);

          const percentage = total ? ((value / total) * 100).toFixed(1) : 0;

          return `${percentage}%`;
        }
      }
    },
  };

  return <Pie data={chartData} options={options} />;
};

export default PieChart;