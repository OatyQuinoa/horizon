import { Company } from '@/types';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeaturedCompanyCardProps {
  company: Company;
}

export default function FeaturedCompanyCard({ company }: FeaturedCompanyCardProps) {
  return (
    <div className="relative bg-gradient-to-br from-card to-card/50 border-l-4 border-primary rounded-lg p-6 sm:p-12 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <span className="text-xs uppercase tracking-wider text-primary font-medium">
          Featured Analysis
        </span>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider mb-2">
            This Week's Deep Dive
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
            {company.name}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-base sm:text-lg text-primary font-medium">
              {company.ticker}
            </span>
            <span className="text-xs sm:text-sm px-3 py-1 bg-muted/50 rounded-full text-muted-foreground uppercase tracking-wide">
              {company.sector}
            </span>
          </div>
        </div>
        
        {company.businessModel && (
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed max-w-3xl">
            {company.businessModel.substring(0, 180)}...
          </p>
        )}
        
        <div className="pt-4">
          <Link
            to={`/company/${company.id}`}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-all duration-200 hover:scale-[0.98] active:scale-95 text-sm sm:text-base"
          >
            Read Full Analysis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
