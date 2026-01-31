import { Company } from '@/types';
import { Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';

interface WatchlistCardProps {
  company: Company;
  onRemove?: (id: string) => void;
}

export default function WatchlistCard({ company, onRemove }: WatchlistCardProps) {
  const priceChange = company.ipoPrice && company.currentPrice 
    ? ((company.currentPrice - company.ipoPrice) / company.ipoPrice * 100)
    : null;
  
  const isOpportunity = priceChange !== null && priceChange < -10;
  const daysToLockup = company.lockupDate 
    ? differenceInDays(new Date(company.lockupDate), new Date())
    : null;
  const lockupApproaching = daysToLockup !== null && daysToLockup <= 30 && daysToLockup > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-5 sm:p-6 hover:shadow-lg transition-all duration-200">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/company/${company.id}`} className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground hover:text-primary transition-colors truncate" style={{ fontFamily: "'Fraunces', serif" }}>
              {company.name}
            </h3>
            <p className="font-mono text-xs sm:text-sm text-muted-foreground mt-1">
              {company.ticker}
            </p>
          </Link>
          
          {onRemove && (
            <button
              onClick={() => onRemove(company.id)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 sm:px-3 py-1 rounded hover:bg-destructive/10 whitespace-nowrap flex-shrink-0"
            >
              Remove
            </button>
          )}
        </div>
        
        {company.ipoPrice && company.currentPrice && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 py-3 border-y border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">IPO Price</p>
              <p className="font-mono text-base sm:text-lg text-foreground">
                ${company.ipoPrice.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current</p>
              <p className="font-mono text-base sm:text-lg text-foreground">
                ${company.currentPrice.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Change</p>
              <div className="flex items-center gap-1">
                {priceChange !== null && (
                  <>
                    {priceChange < 0 ? (
                      <TrendingDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isOpportunity ? 'text-green-500' : 'text-destructive'}`} />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    )}
                    <p className={`font-mono text-base sm:text-lg ${
                      priceChange < 0 
                        ? isOpportunity ? 'text-green-500' : 'text-destructive'
                        : 'text-primary'
                    }`}>
                      {priceChange.toFixed(1)}%
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {company.lockupDate && (
          <div className={`flex items-center gap-2 text-xs sm:text-sm ${lockupApproaching ? 'text-primary' : 'text-muted-foreground'}`}>
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>
              Lockup: {format(new Date(company.lockupDate), 'MMM d, yyyy')}
              {lockupApproaching && daysToLockup && (
                <span className="ml-2 text-primary font-medium">
                  ({daysToLockup} days)
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
