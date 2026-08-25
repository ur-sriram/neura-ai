import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardPlaceholderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  children?: React.ReactNode;
  className?: string;
  minHeight?: string;
}

export const CardPlaceholder: React.FC<CardPlaceholderProps> = ({
  title,
  description,
  icon: Icon,
  actionText,
  children,
  className = '',
  minHeight = 'min-h-[220px]',
}) => {
  return (
    <div className={`custom-card p-5 flex flex-col justify-between ${minHeight} ${className}`}>
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
          </div>
          {actionText && (
            <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded">
              {actionText}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 mb-4">{description}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {children ? (
          children
        ) : (
          <div className="border border-dashed border-slate-200 rounded-lg p-6 bg-slate-50/50 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-medium text-slate-400">
              Module Placeholder / Ready for Integration
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
