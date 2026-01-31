import { mockCompanies } from '@/data/mockData';
import FeaturedCompanyCard from '@/components/FeaturedCompanyCard';
import FilingCard from '@/components/FilingCard';
import { motion } from 'framer-motion';
import { useSecFilings, getDataSourceLabel } from '@/hooks/use-sec-filings';
import LoadingSpinner from '@/components/LoadingSpinner';
import { RefreshCw, Database, Globe } from 'lucide-react';

export default function Dashboard() {
  const { filings, isLoading, error, lastUpdated, refetch, dataSource } = useSecFilings(30, true);

  // Recent S-1 Filings: only SEC data from last 30 days (never old mock data)
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

      {/* Recent Filings Section — last 30 days only from SEC EDGAR */}
      <section className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              Recent S-1 Filings
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              S-1 filings from the last 30 days · SEC EDGAR
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

        {error && (
          <div className="text-xs text-amber-500/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!isLoading && recentFilings.length === 0 && (
          <div className="rounded-lg border border-border bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
            {dataSource === 'sec-api'
              ? 'No S-1 filings in the last 30 days.'
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
