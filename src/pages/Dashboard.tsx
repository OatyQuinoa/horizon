import { useState, useEffect } from 'react';
import { mockCompanies } from '@/data/mockData';
import FeaturedCompanyCard from '@/components/FeaturedCompanyCard';
import { useCompaniesOptional } from '@/context/CompaniesContext';
import FilingCard from '@/components/FilingCard';
import { motion } from 'framer-motion';
import { useSecFilings, getDataSourceLabel } from '@/hooks/use-sec-filings';
import LoadingSpinner from '@/components/LoadingSpinner';
import { RefreshCw, Database, Globe, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const TIME_FRAME_OPTIONS = [
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '14', label: 'Last 14 days', days: 14 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '60', label: 'Last 60 days', days: 60 },
] as const;

const SECTOR_OPTIONS = [
  { value: 'all', label: 'All sectors', softwareOnly: false },
  { value: 'software', label: 'Software only (SIC 7370–7379)', softwareOnly: true },
] as const;

export default function Dashboard() {
  const [timeFrame, setTimeFrame] = useState<string>('30');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  const daysBack = TIME_FRAME_OPTIONS.find((o) => o.value === timeFrame)?.days ?? 30;
  const softwareOnly = SECTOR_OPTIONS.find((o) => o.value === sectorFilter)?.softwareOnly ?? false;

  const { filings, isLoading, error, lastUpdated, refetch, dataSource } = useSecFilings(
    daysBack,
    softwareOnly
  );
  const setSecFilings = useCompaniesOptional()?.setSecFilings;

  useEffect(() => {
    setSecFilings?.(filings);
  }, [filings, setSecFilings]);

  const recentFilings = filings.slice(0, 6);
  // Featured: first filing when we have live SEC data; otherwise first mock featured for hero only
  const featuredFromSec = filings[0];
  const featuredCompany = featuredFromSec ?? mockCompanies.find((c) => c.featured);

  const cardVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: 'easeOut',
      },
    }),
  };

  return (
    <div className="space-y-16">
      {/* Featured Company Section */}
      {featuredCompany && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <FeaturedCompanyCard company={featuredCompany} />
        </motion.section>
      )}

      {/* Recent Filings Section — SEC EDGAR with filters */}
      <section className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              Recent S-1 Filings
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Pipeline (S-1/F-1) + Completed (424B4) · SEC EDGAR
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              {dataSource === 'sec-api' ? (
                <Globe className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Database className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>{getDataSourceLabel(dataSource)}</span>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-1.5 rounded hover:bg-card/50 transition-colors disabled:opacity-50"
              title="Refresh filings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter options: time frame + sector */}
        <div className="flex flex-wrap items-end gap-4 sm:gap-6 p-4 rounded-lg border border-border bg-card/30">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground shrink-0">Filters</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <Label htmlFor="time-frame" className="text-xs text-muted-foreground">
                Time frame
              </Label>
              <Select value={timeFrame} onValueChange={setTimeFrame}>
                <SelectTrigger id="time-frame" className="h-9 w-full sm:w-[160px]">
                  <SelectValue placeholder="Time frame" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FRAME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <Label htmlFor="sector" className="text-xs text-muted-foreground">
                Sector
              </Label>
              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger id="sector" className="h-9 w-full sm:w-[220px]">
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  {SECTOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-xs text-amber-500/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!isLoading && recentFilings.length === 0 && (
          <div className="rounded-lg border border-border bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
            {dataSource === 'sec-api'
              ? `No S-1 filings in the selected time frame (last ${daysBack} days${softwareOnly ? ', software only' : ''}).`
              : 'No recent filings to show. Start the dev server (npm run dev) or production server (npm run start) to load live SEC data.'}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {recentFilings.map((company, index) => (
            <motion.div
              key={company.id}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <FilingCard company={company} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground" style={{ fontFamily: "'Fraunces', serif" }}>
          This Week's Activity
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-card/30 border border-border rounded-lg p-5 sm:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">New Filings</p>
            <p className="text-3xl sm:text-4xl font-mono font-semibold text-foreground">6</p>
          </div>
          <div className="bg-card/30 border border-border rounded-lg p-5 sm:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Watchlist</p>
            <p className="text-3xl sm:text-4xl font-mono font-semibold text-foreground">
              {mockCompanies.filter(c => c.onWatchlist).length}
            </p>
          </div>
          <div className="bg-card/30 border border-border rounded-lg p-5 sm:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Opportunities</p>
            <p className="text-3xl sm:text-4xl font-mono font-semibold text-green-500">2</p>
          </div>
        </div>
      </section>
    </div>
  );
}
