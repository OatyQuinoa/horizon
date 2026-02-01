import { Company } from '@/types';
import { Calendar, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatFilingDate } from '@/lib/sec-filing-service';

interface FilingCardProps {
  company: Company;
}

export default function FilingCard({ company }: FilingCardProps) {
  return (
    <Link
      to={`/company/${company.id}`}
      className="block bg-card border border-border rounded-lg p-5 sm:p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground" style={{ fontFamily: "'Fraunces', serif" }}>
            {company.name}
          </h3>
          <span className="font-mono text-xs sm:text-sm text-primary font-medium whitespace-nowrap">
            {company.ticker || (company.cik ? `CIK ${company.cik.replace(/^0+/, '')}` : '—')}
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {company.ipoStatus && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                company.ipoStatus === 'completed'
                  ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
              title={company.ipoStatus === 'completed' ? 'IPO completed (424B4 filed)' : 'IPO pipeline (S-1/F-1 filed)'}
            >
              {company.ipoStatus === 'completed' ? 'IPO Priced' : 'Pipeline'}
            </span>
          )}
          <span
            className="text-xs px-2.5 sm:px-3 py-1 bg-muted/30 rounded-full text-muted-foreground uppercase tracking-wide max-w-[140px] truncate"
            title={company.sicDescription ?? company.sector}
          >
            {company.sector || company.sicDescription || '—'}
          </span>
          {company.sicCode && (
            <span className="text-xs px-2 py-0.5 bg-muted/20 rounded text-muted-foreground/70 font-mono">
              SIC {company.sicCode}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
          <div
            className="flex items-center gap-1.5"
            title={
              company.ipoStatus === 'completed'
                ? 'Prospectus (424B4) filing date — offering priced'
                : 'S-1 filing date — IPO intent'
            }
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>
              {company.ipoStatus === 'completed'
                ? `Prospectus filed ${formatFilingDate(company.filingDate)}`
                : `S-1 filed ${formatFilingDate(company.filingDate)}`}
            </span>
          </div>
          <div className="flex items-center gap-1 text-primary/70">
            <FileText className="w-3 h-3" />
            <span className="text-xs font-mono">SEC</span>
          </div>
        </div>
        
        {company.businessModel && (
          <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed line-clamp-2">
            {company.businessModel}
          </p>
        )}
      </div>
    </Link>
  );
}
