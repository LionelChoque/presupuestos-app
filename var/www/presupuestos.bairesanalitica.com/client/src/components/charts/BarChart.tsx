import { useRef, useEffect } from 'react';
import { Chart, ChartData, ChartOptions } from 'chart.js/auto';

interface BarChartProps {
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
  height?: number;
  width?: number;
  className?: string;
}

export function BarChart({
  data,
  options = {},
  height = 300,
  width = 500,
  className = '',
}: BarChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Clean up any existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            padding: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleColor: '#fff',
            bodyColor: '#fff',
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              size: 13,
            },
            displayColors: true,
            boxPadding: 5,
          },
        },
        ...options,
      },
    });

    // Clean up on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, options]);

  return (
    <div 
      style={{ height: `${height}px`, width: '100%' }} 
      className={className}
    >
      <canvas ref={chartRef} />
    </div>
  );
}
