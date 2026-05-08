interface StatCardProps {
  label: string;
  value: number;
  status: 'safe' | 'warning' | 'danger' | 'neutral';
}

function StatCard({ label, value, status }: StatCardProps) {
  const configs = {
    safe: {
      bg: 'rgba(34,197,94,0.10)',
      text: '#22C55E'
    },
    warning: {
      bg: 'rgba(245,158,11,0.10)',
      text: '#F59E0B'
    },
    danger: {
      bg: 'rgba(239,68,68,0.10)',
      text: '#EF4444'
    },
    neutral: {
      bg: 'rgba(107,114,128,0.10)',
      text: '#6B7280'
    }
  };

  const config = configs[status];

  return (
    <div 
      className="flex flex-col items-center justify-center text-center rounded-[12px] overflow-hidden"
      style={{ 
        flex: 1, 
        minWidth: 0, 
        padding: '12px 8px', 
        backgroundColor: config.bg 
      }}
    >
      <div 
        className="font-bold tabular-nums"
        style={{ fontSize: '28px', color: config.text, lineHeight: 1 }}
      >
        {value}
      </div>
      <div 
        className="mt-1 font-medium"
        style={{ fontSize: '12px', color: '#6B7280' }}
      >
        {label}
      </div>
    </div>
  );
}

interface Props {
  stats: {
    healthy: number;
    warning: number;
    over: number;
  };
}

export function BudgetSummaryStats({ stats }: Props) {
  const isAllZero = stats.healthy === 0 && stats.warning === 0 && stats.over === 0;

  return (
    <div className="flex flex-row w-full" style={{ gap: '8px' }}>
      <StatCard 
        label="Healthy" 
        value={stats.healthy} 
        status={isAllZero ? 'neutral' : 'safe'} 
      />
      <StatCard 
        label="Warning" 
        value={stats.warning} 
        status={isAllZero ? 'neutral' : 'warning'} 
      />
      <StatCard 
        label="Over Budget" 
        value={stats.over} 
        status={isAllZero ? 'neutral' : 'danger'} 
      />
    </div>
  );
}

