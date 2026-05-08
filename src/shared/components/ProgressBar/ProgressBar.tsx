interface ProgressBarProps {
  percentage: number;
  status?: 'safe' | 'warning' | 'danger';
}

export function ProgressBar({ percentage, status = 'safe' }: ProgressBarProps) {
  const cappedPercentage = Math.min(percentage, 100);
  
  const statusColors = {
    safe: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444'
  };

  const barColor = statusColors[status];

  return (
    <div className="w-full h-[6px] bg-gray-100 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ 
          width: `${cappedPercentage}%`,
          backgroundColor: barColor
        }}
      />
    </div>
  );
}
