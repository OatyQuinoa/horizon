import { useState, useEffect } from 'react';
import FeaturedCompanyCard from '@/components/FeaturedCompanyCard';
import { useCompaniesOptional } from '@/context/CompaniesContext';
import FilingCard from '@/components/FilingCard';
import { motion } from 'framer-motion';
import { getDataSourceLabel, filterFilingsForDisplay, type FilingTypeFilter } from '@/hooks/use-sec-filings';
import { RefreshCw, Database, Globe, Filter, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const TIME_FRAME_OPTIONS = [
  { value: 'week', label: 'Week', days: 7 },
  { value: 'month', label: 'Month', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'yearly', label: 'Yearly', days: 365 },
  { value: 'all', label: 'All (2025–2026)', days: 500 },
] as const;

const IPO_YEAR_OPTIONS = [
  { value: 'all', label: 'All years' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
] as const;

const EXCHANGE_OPTIONS = [
  { value: 'all', label: 'All exchanges' },
  { value: 'nyse', label: 'NYSE' },
  { value: 'nasdaq', label: 'NASDAQ' },
] as const;

const FILING_TYPE_OPTIONS = [
  { value: 'all', label: 'All filings' },
  { value: 'completed', label: 'IPO-priced (424B4)' },
  { value: 'pipeline', label: 'S-1 (Pipeline)' },
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

const INITIAL_VISIBLE = 100;
const LOAD_MORE_COUNT = 50;

export default function Dashboard() {
  const ctx = useCompaniesOptional();
  const secFilings = ctx?.secFilings ?? [];
  const isLoading = ctx?.isLoading ?? false;
  const error = ctx?.error ?? null;
  const dataSource = ctx?.dataSource ?? 'loading';
  const refetch = ctx?.refetch ?? (() => Promise.resolve());
  const dashboardFilters = ctx?.dashboardFilters ?? { timeFrame: 'all', sectorFilter: 'all', filingTypeFilter: 'all', searchQuery: '', ipoYear: '2025', exchange: 'all' };
  const setDashboardFilters = ctx?.setDashboardFilters ?? (() => {});

  const { timeFrame, sectorFilter, filingTypeFilter, searchQuery, ipoYear, exchange } = dashboardFilters;

  const daysBack = TIME_FRAME_OPTIONS.find((o) => o.value === timeFrame)?.days ?? 30;

  // Filter cached SEC data by timeframe, sector, filing type, and IPO year
  const filteredByYearAndSector = filterFilingsForDisplay(secFilings, daysBack, sectorFilter, filingTypeFilter, ipoYear);

  // Client-side search: company name, ticker (prospectus text later)
  const q = searchQuery.trim().toLowerCase();
  const displayFilings = q
    ? filteredByYearAndSector.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.ticker || '').toLowerCase().includes(q)
      )
    : filteredByYearAndSector;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [sectorFilter, timeFrame, filingTypeFilter, ipoYear, exchange, searchQuery]);

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

      {/* Recent Filings Section — SEC EDGAR with search + filters */}
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

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Company, ticker, or prospectus text"
            value={searchQuery}
            onChange={(e) => setDashboardFilters({ searchQuery: e.target.value })}
            className="pl-9 h-10 rounded-lg border-border bg-card/30 text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Search by company name, ticker, or prospectus text"
          />
        </div>

        {/* Calm filters: IPO year, exchange, industry/sector, filing type */}
        <div className="flex flex-wrap items-end gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-muted/20 border border-border/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex flex-col gap-1 min-w-[100px]">
              <Label htmlFor="ipo-year" className="text-xs text-muted-foreground">
                IPO year
              </Label>
              <Select value={ipoYear} onValueChange={(v) => setDashboardFilters({ ipoYear: v })}>
                <SelectTrigger id="ipo-year" className="h-8 w-full sm:w-[100px] text-sm border-border/70 bg-background/80">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {IPO_YEAR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 min-w-[120px]">
              <Label htmlFor="exchange" className="text-xs text-muted-foreground">
                Exchange
              </Label>
              <Select value={exchange} onValueChange={(v) => setDashboardFilters({ exchange: v })}>
                <SelectTrigger id="exchange" className="h-8 w-full sm:w-[120px] text-sm border-border/70 bg-background/80">
                  <SelectValue placeholder="Exchange" />
                </SelectTrigger>
                <SelectContent>
                  {EXCHANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 min-w-[140px]">
              <Label htmlFor="sector" className="text-xs text-muted-foreground">
                Industry / sector
              </Label>
              <Select value={sectorFilter} onValueChange={(v) => setDashboardFilters({ sectorFilter: v })}>
                <SelectTrigger id="sector" className="h-8 w-full sm:w-[180px] text-sm border-border/70 bg-background/80">
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
            <div className="flex flex-col gap-1 min-w-[120px]">
              <Label htmlFor="filing-type" className="text-xs text-muted-foreground">
                Filing type
              </Label>
              <Select value={filingTypeFilter} onValueChange={(v) => setDashboardFilters({ filingTypeFilter: v })}>
                <SelectTrigger id="filing-type" className="h-8 w-full sm:w-[120px] text-sm border-border/70 bg-background/80">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {FILING_TYPE_OPTIONS.map((opt) => (
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
              ? searchQuery.trim()
                ? `No filings match “${searchQuery.trim()}” for ${IPO_YEAR_OPTIONS.find((o) => o.value === ipoYear)?.label ?? ipoYear}${sectorFilter !== 'all' ? `, ${SECTOR_OPTIONS.find((o) => o.value === sectorFilter)?.label ?? sectorFilter}` : ''}${filingTypeFilter !== 'all' ? `, ${FILING_TYPE_OPTIONS.find((o) => o.value === filingTypeFilter)?.label ?? filingTypeFilter}` : ''}. Try a different search or filters.`
                : `No filings for ${IPO_YEAR_OPTIONS.find((o) => o.value === ipoYear)?.label ?? ipoYear}${sectorFilter !== 'all' ? `, ${SECTOR_OPTIONS.find((o) => o.value === sectorFilter)?.label ?? sectorFilter}` : ''}${filingTypeFilter !== 'all' ? `, ${FILING_TYPE_OPTIONS.find((o) => o.value === filingTypeFilter)?.label ?? filingTypeFilter}` : ''}.`
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
