
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  className?: string; 
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, className }) => {
  return (
    <div className={`bg-muted p-5 rounded-xl shadow hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-foreground-muted tracking-tight">{title}</h3>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {description && <p className="text-xs text-foreground-muted mt-1">{description}</p>}
    </div>
  );
};

export default StatCard;