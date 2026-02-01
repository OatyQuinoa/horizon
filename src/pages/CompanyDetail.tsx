import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockCompanies, mockMetrics } from '@/data/mockData';
import MetricCard from '@/components/MetricCard';
import { ArrowLeft, ExternalLink, Edit2, Save, X, Star, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { formatLargeNumber, formatPercentage } from '@/lib/sec-api';
import { useCompaniesOptional } from '@/context/CompaniesContext';
import { fetchCompanyById } from '@/lib/sec-filing-service';
import { Company } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProspectusBriefingCard from '@/components/ProspectusBriefing';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const ctx = useCompaniesOptional();
  const fromContext = ctx?.secFilings?.find((c) => c.id === id);
  const fromMock = mockCompanies.find((c) => c.id === id);
  const [fetchedSec, setFetchedSec] = useState<Company | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const company = fromContext ?? fromMock ?? fetchedSec;

  useEffect(() => {
    if (id && !fromContext && !fromMock && /^\d{10}-[\d-]+$/.test(id)) {
      setIsFetching(true);
      fetchCompanyById(id)
        .then((sec) => {
          if (sec) setFetchedSec(sec as unknown as Company);
        })
        .finally(() => setIsFetching(false));
    }
  }, [id, fromContext, fromMock]);

  const [isEditingThesis, setIsEditingThesis] = useState(false);
  const [isEditingConcerns, setIsEditingConcerns] = useState(false);
  const [thesis, setThesis] = useState(company?.thesis || '');
  const [concerns, setConcerns] = useState(company?.concerns || '');
  const [onWatchlist, setOnWatchlist] = useState(company?.onWatchlist || false);

  useEffect(() => {
    if (company) {
      setThesis(company.thesis || '');
      setConcerns(company.concerns || '');
      setOnWatchlist(company.onWatchlist || false);
    }
  }, [company?.id]);

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">Company not found</p>
        <Link to="/" className="text-primary hover:underline mt-4 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const metrics = mockMetrics[company.id as keyof typeof mockMetrics] || [];

  const handleSaveThesis = () => {
    setIsEditingThesis(false);
    toast.success('Investment thesis saved');
  };

  const handleSaveConcerns = () => {
    setIsEditingConcerns(false);
    toast.success('Concerns saved');
  };

  const toggleWatchlist = () => {
    setOnWatchlist(!onWatchlist);
    toast.success(onWatchlist ? 'Removed from watchlist' : 'Added to watchlist');
  };

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Header */}
      <div className="space-y-4 sm:space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
              <span className="font-mono text-lg sm:text-xl text-primary font-medium">
                {company.ticker || (company.cik ? `CIK ${company.cik.replace(/^0+/, '')}` : '—')}
              </span>
              {company.ipoStatus && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    company.ipoStatus === 'completed'
                      ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {company.ipoStatus === 'completed' ? 'IPO Priced' : 'Pipeline'}
                </span>
              )}
              <span className="text-xs sm:text-sm px-2.5 sm:px-3 py-1 bg-muted/50 rounded-full text-muted-foreground uppercase tracking-wide">
                {company.sector}
              </span>
              {company.sicCode && (
                <span className="text-xs px-2 py-0.5 bg-muted/30 rounded text-muted-foreground font-mono" title={company.sicDescription}>
                  SIC: {company.sicCode}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              {company.name}
            </h1>
            {company.cik && (
              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                CIK: {company.cik}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={toggleWatchlist}
              className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md border transition-all duration-200 text-sm flex-1 sm:flex-initial ${
                onWatchlist
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
              }`}
            >
              <Star className={`w-4 h-4 ${onWatchlist ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{onWatchlist ? 'On Watchlist' : 'Add to Watchlist'}</span>
              <span className="sm:hidden">{onWatchlist ? 'Watching' : 'Watch'}</span>
            </button>

            <a
              href={company.s1Link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-card border border-border rounded-md text-foreground hover:bg-card/80 transition-all duration-200 text-sm flex-1 sm:flex-initial"
              title={`View SEC EDGAR Filing - CIK: ${company.cik}`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">View S-1 Filing</span>
              <span className="sm:hidden">S-1</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* SEC Filing Information */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="space-y-4"
      >
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground" style={{ fontFamily: "'Fraunces', serif" }}>
          SEC Filing Information
        </h2>
        <div className="bg-card/30 border border-border rounded-lg p-5 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">S-1 Filing Date</p>
              <p className="font-mono text-sm text-foreground">
                {company.filingDate
                  ? new Date(company.filingDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                Registration date, not IPO/offer date
              </p>
            </div>
            {company.accessionNumber && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Accession #</p>
                <p className="font-mono text-xs text-foreground break-all">{company.accessionNumber}</p>
              </div>
            )}
            {company.sicDescription && (
              <div className="col-span-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Industry Classification</p>
                <p className="text-sm text-foreground">{company.sicDescription}</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border space-y-4">
            <a
              href={company.s1Link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <FileText className="w-4 h-4" />
              View Full Filing on SEC EDGAR
              <ExternalLink className="w-3 h-3" />
            </a>
            {company.accessionNumber && company.cik && (
              <ProspectusBriefingCard
                companyName={company.name}
                cik={company.cik}
                accessionNumber={company.accessionNumber}
                filingDate={company.filingDate}
                formType={company.ipoStatus === 'completed' ? '424B4' : 'S-1'}
                onError={(msg) => toast.error(msg)}
              />
            )}
          </div>
        </div>
      </motion.section>

      {/* Metrics Grid */}
      {metrics.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-4 sm:space-y-6"
        >
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground" style={{ fontFamily: "'Fraunces', serif" }}>
            Key Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {metrics.map((metric, index) => (
              <MetricCard key={index} metric={metric} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Business Model */}
      {company.businessModel && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground" style={{ fontFamily: "'Fraunces', serif" }}>
            Business Model
          </h2>
          <div className="bg-card/30 border border-border rounded-lg p-5 sm:p-8">
            <p className="text-foreground/90 leading-relaxed text-base sm:text-lg">
              {company.businessModel}
            </p>
          </div>
        </motion.section>
      )}

      {/* Investment Thesis */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground" style={{ fontFamily: "'Fraunces', serif" }}>
            Investment Thesis
          </h2>
          {!isEditingThesis && (
            <button
              onClick={() => setIsEditingThesis(true)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {isEditingThesis ? (
          <div className="space-y-3">
            <Textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              className="min-h-[200px] bg-card border-border text-foreground"
              placeholder="Write your investment thesis..."
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveThesis}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingThesis(false);
                  setThesis(company.thesis || '');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-md hover:bg-card/80 transition-all"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card/30 border-l-4 border-primary rounded-lg p-5 sm:p-8">
            {thesis ? (
              <p className="text-foreground/90 leading-relaxed text-base sm:text-lg">
                {thesis}
              </p>
            ) : (
              <p className="text-muted-foreground italic text-sm sm:text-base">
                No investment thesis written yet. Click Edit to add your analysis.
              </p>
            )}
          </div>
        )}
      </motion.section>

      {/* Concerns */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground" style={{ fontFamily: "'Fraunces', serif" }}>
            Concerns & Risks
          </h2>
          {!isEditingConcerns && (
            <button
              onClick={() => setIsEditingConcerns(true)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {isEditingConcerns ? (
          <div className="space-y-3">
            <Textarea
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              className="min-h-[200px] bg-card border-border text-foreground"
              placeholder="Write your concerns and risk analysis..."
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveConcerns}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditingConcerns(false);
                  setConcerns(company.concerns || '');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-md hover:bg-card/80 transition-all"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card/30 border-l-4 border-destructive rounded-lg p-5 sm:p-8">
            {concerns ? (
              <p className="text-foreground/90 leading-relaxed text-base sm:text-lg">
                {concerns}
              </p>
            ) : (
              <p className="text-muted-foreground italic text-sm sm:text-base">
                No concerns documented yet. Click Edit to add risk analysis.
              </p>
            )}
          </div>
        )}
      </motion.section>
    </div>
  );
}
