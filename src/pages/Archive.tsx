import { mockDigests } from '@/data/mockData';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Archive() {
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
    <div className="space-y-8 sm:space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: "'Fraunces', serif" }}>
          Digest Archive
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Browse past weekly analyses and deep dives
        </p>
      </div>

      {/* Digest List */}
      <div className="space-y-3 sm:space-y-4">
        {mockDigests.map((digest, index) => (
          <motion.article
            key={digest.id}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-card border border-border rounded-lg p-5 sm:p-8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground flex-1" style={{ fontFamily: "'Fraunces', serif" }}>
                  {digest.subject}
                </h2>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(digest.date), 'MMM d, yyyy')}</span>
                </div>
              </div>
              
              <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                {digest.summary}
              </p>
              
              <div className="pt-2">
                <span className="text-xs sm:text-sm text-primary hover:underline">
                  Read full digest →
                </span>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {/* Archive Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-border">
        <div className="text-center">
          <p className="text-3xl sm:text-4xl font-mono font-semibold text-foreground mb-2">
            {mockDigests.length}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
            Weekly Digests
          </p>
        </div>
        <div className="text-center">
          <p className="text-3xl sm:text-4xl font-mono font-semibold text-foreground mb-2">
            {mockDigests.length * 2}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
            Companies Analyzed
          </p>
        </div>
        <div className="text-center">
          <p className="text-3xl sm:text-4xl font-mono font-semibold text-foreground mb-2">
            12
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
            Weeks Active
          </p>
        </div>
      </div>
    </div>
  );
}
