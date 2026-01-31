import { useState } from 'react';
import { mockCompanies } from '@/data/mockData';
import WatchlistCard from '@/components/WatchlistCard';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState(
    mockCompanies.filter(c => c.onWatchlist)
  );

  const opportunities = watchlist.filter(c => {
    if (!c.ipoPrice || !c.currentPrice) return false;
    const change = ((c.currentPrice - c.ipoPrice) / c.ipoPrice * 100);
    return change < -10;
  });

  const monitoring = watchlist.filter(c => !opportunities.includes(c));

  const handleRemove = (id: string) => {
    const company = watchlist.find(c => c.id === id);
    setWatchlist(watchlist.filter(c => c.id !== id));
    toast.success(`${company?.name} removed from watchlist`);
  };

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
    <div className="space-y-12 sm:space-y-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
          Watchlist
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Track post-IPO opportunities and companies under observation
        </p>
      </div>

      {/* Post-IPO Opportunities */}
      {opportunities.length > 0 && (
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 sm:h-8 bg-green-500 rounded-full" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground" style={{ fontFamily: "'Fraunces', serif" }}>
                Post-IPO Opportunities
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Companies trading 10%+ below IPO price
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {opportunities.map((company, index) => (
              <motion.div
                key={company.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <WatchlistCard company={company} onRemove={handleRemove} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Monitoring */}
      {monitoring.length > 0 && (
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 sm:h-8 bg-primary rounded-full" />
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground" style={{ fontFamily: "'Fraunces', serif" }}>
                Monitoring
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Pre-IPO filings and other tracked companies
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {monitoring.map((company, index) => (
              <motion.div
                key={company.id}
                custom={index + opportunities.length}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <WatchlistCard company={company} onRemove={handleRemove} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {watchlist.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <p className="text-muted-foreground text-base sm:text-lg">
            No companies on your watchlist yet
          </p>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Browse recent filings to add companies to track
          </p>
        </div>
      )}
    </div>
  );
}
