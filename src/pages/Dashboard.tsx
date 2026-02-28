import { useState, useEffect } from 'react';
import FeaturedCompanyCard from '@/components/FeaturedCompanyCard';
import { useCompaniesOptional } from '@/context/CompaniesContext';
import FilingCard from '@/components/FilingCard';
import { motion } from 'framer-motion';
import { getDataSourceLabel, filterFilingsForDisplay } from '@/hooks/use-sec-filings';
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
  { value: '90', label: 'Last 90 days', days: 90 },
  { value: '180', label: 'Last 6 months', days: 180 },
  { value: '365', label: 'Last 12 months', days: 365 },
] as const;

const SECTOR_OPTIONS = [
  { value: 'all', label: 'All sectors' },
  { value: 'software', label: 'Technology / Software' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'financial', label: 'Financial' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'energy', label: 'Energy' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'communications', label: 'Communications' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
] as const;

const INITIAL_VISIBLE = 12;
const LOAD_MORE_COUNT = 12;

export default function Dashboard() {
  const [timeFrame, setTimeFrame] = useState<string>('30');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  const daysBack = TIME_FRAME_OPTIONS.find((o) => o.value === timeFrame)?.days ?? 30;

  const ctx = useCompaniesOptional();
  const secFilings = ctx?.secFilings ?? [];
  const isLoading = ctx?.isLoading ?? false;
  const error = ctx?.error ?? null;
  const dataSource = ctx?.dataSource ?? 'loading';
  const refetch = ctx?.refetch ?? (() => Promise.resolve());

  // Filter cached SEC data by selected time frame and sector (no refetch on navigation or filter change)
  const displayFilings = filterFilingsForDisplay(secFilings, daysBack, sectorFilter);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [sectorFilter, timeFrame]);

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const recentFilings = displayFilings.slice(0, visibleCount);
  const hasMore = displayFilings.length > visibleCount;
  // Featured: only the first filing from current SEC data (no fixed default like Maplebear)
  const featuredCompany = displayFilings.length > 0 ? displayFilings[0] : null;

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
              Recent Filings
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

        {!isLoading && displayFilings.length === 0 && (
          <div className="rounded-lg border border-border bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
            {dataSource === 'sec-api'
              ? `No S-1 filings in the selected time frame (last ${daysBack} days${sectorFilter !== 'all' ? `, ${SECTOR_OPTIONS.find((o) => o.value === sectorFilter)?.label ?? sectorFilter}` : ''}).`
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

        {hasMore && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setVisibleCount((c) => Math.min(c + LOAD_MORE_COUNT, displayFilings.length))}
              className="text-sm font-medium text-primary hover:text-primary/80 px-4 py-2 rounded-lg border border-border hover:bg-card/50 transition-colors"
            >
              Load more ({displayFilings.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
