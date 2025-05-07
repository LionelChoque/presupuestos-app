import { useRef, useEffect } from 'react';
import { Chart, ChartData, ChartOptions } from 'chart.js/auto';

interface DoughnutChartProps {
  data: ChartData<'doughnut'>;
  options?: ChartOptions<'doughnut'>;
  height?: number;
  width?: number;
  className?: string;
}

export function DoughnutChart({
  data,
  options = {},
  height = 300,
  width = 500,
  className = '',
}: DoughnutChartProps) {
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
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              boxWidth: 12,
              font: {
                size: 12,
              },
            },
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
