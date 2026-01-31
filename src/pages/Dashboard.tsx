import { mockCompanies } from '@/data/mockData';
import FeaturedCompanyCard from '@/components/FeaturedCompanyCard';
import FilingCard from '@/components/FilingCard';
import { motion } from 'framer-motion';
import { useSecFilings, getDataSourceLabel } from '@/hooks/use-sec-filings';
import LoadingSpinner from '@/components/LoadingSpinner';
import { RefreshCw, Database, Globe } from 'lucide-react';

export default function Dashboard() {
  const { filings, isLoading, error, lastUpdated, refetch, dataSource } = useSecFilings(30, true);
  
  // Use mock data as the display source (with proper filing dates)
  // In production with a backend, this would use the filings from SEC API
  const displayFilings = mockCompanies;
  const featuredCompany = displayFilings.find(c => c.featured);
  const recentFilings = displayFilings.filter(c => !c.featured).slice(0, 6);

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

      {/* Recent Filings Section */}
      <section className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              Recent S-1 Filings
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Software company IPO filings from SEC EDGAR
            </p>
          </div>
          
          {/* Data source indicator */}
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
