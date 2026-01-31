import { Metric } from '@/types';

interface MetricCardProps {
  metric: Metric;
}

export default function MetricCard({ metric }: MetricCardProps) {
  return (
    <div className="bg-card/50 border border-border rounded-lg p-4 sm:p-6 text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 sm:mb-3 font-medium">
        {metric.label}
      </p>
      <p className="text-2xl sm:text-3xl font-mono font-medium text-foreground">
        {metric.value}
      </p>
    </div>
  );
}
