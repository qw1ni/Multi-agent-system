import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const BarChart = ({ chartData, title }) => {

    const calculateLeftPadding = (labels, data) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let maxWidth = 0;

        labels.forEach((label, index) => {
            const value = data.datasets[0].data[index];

            ctx.font = value === null
                ? 'bold 13px Roboto, sans-serif'
                : '13px Roboto, sans-serif';

            const indent = value === null ? 10 : 30;

            const width = ctx.measureText(label).width + indent;

            if (width > maxWidth) {
                maxWidth = width;
            }
        });

        return Math.ceil(maxWidth) + 40;
    };

    const wrapText = (ctx, text, maxWidth) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + ' ' + word).width;

            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }

        lines.push(currentLine);
        return lines;
    };

    const dynamicLeftPadding =
        calculateLeftPadding(chartData.labels, chartData);

    // ПЛАГИН ДЛЯ БЕЛОГО ФОНА
    const whiteBackgroundPlugin = {
        id: 'whiteBackground',
        beforeDraw: (chart) => {
            const { ctx, width, height } = chart;
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    };

    // ПЛАГИН ДЛЯ ОТРИСОВКИ ЗНАЧЕНИЙ
    const columnValuesPlugin = {
        id: 'columnValues',
        afterDatasetsDraw: (chart) => {
            const { ctx, data } = chart;

            chart.getDatasetMeta(0).data.forEach((bar, index) => {
                const value = data.datasets[0].data[index];
                if (value === undefined || value === null) return;

                const xPosition = bar.x + 8;

                ctx.save();
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 12px Roboto, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(value, xPosition, bar.y);
                ctx.restore();
            });
        }
    };

    // ПЛАГИН ДЛЯ РАЗДЕЛЕНИЯ И ГРУППИРОВКИ
    const groupedLayoutPlugin = {
        id: 'groupedLayout',
        afterDraw: (chart) => {
            const { ctx, data, chartArea: { right } } = chart;
            const yAxis = chart.scales.y;

            const ticks = yAxis.getTicks() || [];
            ticks.forEach((tick, index) => {
                const label = data.labels[index];
                const value = data.datasets[0].data[index];
                const yPosition = yAxis.getPixelForTick(index);

                if (!label) return;

                ctx.save();

                if (value === null) {
                    ctx.fillStyle = '#111827';
                    ctx.font = 'bold 16px Roboto, sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';

                    ctx.fillText(label, 10, yPosition);

                    if (index > 0) {
                        const prevY = yAxis.getPixelForTick(index - 1);
                        const midY = (yPosition + prevY) / 2;

                        ctx.beginPath();
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 1.5;
                        ctx.moveTo(10, midY);
                        ctx.lineTo(right, midY);
                        ctx.stroke();
                    }
                } else {
                    ctx.fillStyle = '#4b5563';
                    ctx.font = '15px Roboto, sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    const maxTextWidth = 260;
                    const lines = wrapText(ctx, label, maxTextWidth);
                    const lineHeight = 18;
                    const totalHeight = lines.length * lineHeight;
                    const startY = yPosition - totalHeight / 2 + lineHeight / 2;
                    lines.forEach((line, i) => {
                        ctx.fillText(line, 30, startY + i * lineHeight);
                    });
                }

                ctx.restore();
            });
        }
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            title: {
                display: !!title,
                text: title,
                align: 'start',
                color: '#111827',
                font: {
                    size: 18,
                    weight: 'bold'
                },
                padding: {
                    top: 10,
                    bottom: 20
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                padding: 12,
                filter: (tooltipItem) => tooltipItem.raw !== null
            },
            datalabels: { display: false }
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: { color: '#e0e0e0' },
                ticks: { color: '#555' }
            },
            y: {
                grid: { display: false },
                ticks: {
                    display: false,
                }
            }
        },
        layout: {
            padding: {
                left: 300,
                right: 40
            }
        }
    };

    const calculatedHeight = chartData.labels.length * 40 + 100;

    return (
        <div style={{ height: `${calculatedHeight}px`, width: '100%', minHeight: '500px' }}>
            <Bar
                data={chartData}
                options={options}
                plugins={[whiteBackgroundPlugin, columnValuesPlugin, groupedLayoutPlugin]}
            />
        </div>
    );
};

export default BarChart;