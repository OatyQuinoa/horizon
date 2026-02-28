/**
 * Glossary: A guided orientation to the IPO ecosystem.
 * Clear, calm, factual. Understand the structure before evaluating the opportunity.
 */

import { motion } from 'framer-motion';

function GlossarySection({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2
        className="text-xl sm:text-2xl font-semibold text-foreground border-b border-border pb-2"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        {title}
      </h2>
      {intro && <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{intro}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Term({ term, definition }: { term: string; definition: string }) {
  return (
    <div className="pl-0 sm:pl-4 border-l-2 border-border/50">
      <dt className="font-medium text-foreground text-sm sm:text-base">{term}</dt>
      <dd className="mt-1 text-sm text-muted-foreground leading-relaxed">{definition}</dd>
    </div>
  );
}

export default function Glossary() {
  return (
    <div className="max-w-[720px] mx-auto space-y-14">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        <h1
          className="text-2xl sm:text-3xl font-bold text-foreground"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Glossary
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          A guided orientation to the IPO ecosystem. Understanding the machinery helps you evaluate
          the opportunity with clarity.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="space-y-14"
      >
        {/* 1. The IPO Lifecycle */}
        <GlossarySection
          title="1. The IPO Lifecycle"
          intro="Process before paperwork. A private company files an S-1, goes through SEC review and amendments, conducts a roadshow, prices the offering, files the final prospectus (424B4), and begins trading. Later, lock-up expiration can affect supply. Think of it as a timeline, not a regulation manual."
        >
          <Term
            term="IPO (Initial Public Offering)"
            definition="A company’s first sale of shares to public investors."
          />
          <Term
            term="S-1 Registration Statement"
            definition="The initial filing that discloses the business, risks, financials, and proposed offering structure. Often amended multiple times during SEC review."
          />
          <Term
            term="S-1/A"
            definition="An amendment to the S-1 filed during SEC review."
          />
          <Term
            term="Roadshow"
            definition="Management marketing the offering to institutional investors before pricing."
          />
          <Term
            term="424B4 Final Prospectus"
            definition="Filed after pricing. Contains final share count, price, underwriting details, and updated financial data."
          />
          <Term
            term="Lock-Up Period"
            definition="Typically 180 days during which insiders cannot sell shares. Expiration can create supply shocks and volatility."
          />
        </GlossarySection>

        {/* 2. Filing Types & Why They Matter */}
        <GlossarySection
          title="2. Filing Types & Why They Matter"
          intro="Not just what each filing is—why it matters to a long-term investor. IPO analysis does not stop at listing day."
        >
          <Term
            term="S-1 vs. 424B4"
            definition="S-1 is evolving disclosure during SEC review. 424B4 is the finalized offering terms and capital structure. If you are analyzing ownership dilution or insider selling, the 424B4 is definitive."
          />
          <Term
            term="8-K"
            definition="Material event filing. Post-IPO developments often show up here."
          />
          <Term
            term="10-Q / 10-K"
            definition="Quarterly and annual reports after the IPO. The real test of IPO promises begins here."
          />
        </GlossarySection>

        {/* 3. What to Look For in a Prospectus */}
        <GlossarySection
          title="3. What to Look For in a Prospectus"
          intro="Disciplined evaluation. Pattern recognition, not hype."
        >
          <Term
            term="Revenue Quality"
            definition="Is revenue recurring? Concentrated? Growing through pricing or volume?"
          />
          <Term
            term="Gross Margin"
            definition="Does the business improve as it scales?"
          />
          <Term
            term="Net Loss & Burn Rate"
            definition="How fast is cash being consumed?"
          />
          <Term
            term="Use of Proceeds"
            definition="Is capital being used to grow, repay debt, or fund operating losses?"
          />
          <Term
            term="Dilution"
            definition="What percentage of the company is being sold? Who is selling—insiders or the company?"
          />
          <Term
            term="Customer Concentration"
            definition="Does one client represent a large share of revenue?"
          />
          <Term
            term="Risk Factors"
            definition="Are risks generic boilerplate or highly specific to the business?"
          />
          <Term
            term="Capital Structure"
            definition="Preferred shares? Dual-class voting? Insider control?"
          />
        </GlossarySection>

        {/* 4. Risks Specific to IPO Investing */}
        <GlossarySection
          title="4. Risks Specific to IPO Investing"
          intro="IPO investing is not inherently superior to buying established companies. It is often higher uncertainty."
        >
          <Term
            term="Information Asymmetry"
            definition="Public investors receive disclosure; insiders possess operational depth."
          />
          <Term
            term="Limited Operating History"
            definition="Many IPO companies are unprofitable or have short track records."
          />
          <Term
            term="Lock-Up Expiration Volatility"
            definition="Supply increases when insiders can sell; share price can be pressured."
          />
          <Term
            term="Narrative Premium"
            definition="IPO pricing often reflects optimism rather than proven results."
          />
          <Term
            term="No Public Track Record"
            definition="There is no multi-year earnings history under public scrutiny."
          />
        </GlossarySection>

        {/* 5. Behavioral Prudence */}
        <GlossarySection
          title="5. Behavioral Prudence"
          intro="How you approach IPO investing matters. A reason that survives volatility is more durable than momentum."
        >
          <Term
            term="First-Day Pop"
            definition="Short-term price movement is not long-term performance."
          />
          <Term
            term="Thesis vs. Momentum"
            definition="Investing requires a reason that can survive volatility."
          />
          <Term
            term="Time Horizon"
            definition="Realized returns often take years, not days."
          />
          <Term
            term="Concentration Risk"
            definition="Avoid overexposure to a single new listing."
          />
          <Term
            term="Expect Volatility"
            definition="New listings frequently experience unstable pricing."
          />
        </GlossarySection>

        {/* 6. Common IPO Red Flags (Advanced) */}
        <GlossarySection
          title="6. Common IPO Red Flags"
          intro="Educational, not alarmist. Signs that warrant closer scrutiny."
        >
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2 pl-2">
            <li>Heavy insider selling in the offering.</li>
            <li>Proceeds primarily used to repay insiders.</li>
            <li>Rapid revenue growth with declining gross margin.</li>
            <li>Excessive related-party transactions.</li>
          </ul>
        </GlossarySection>
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="pt-8 border-t border-border text-xs text-muted-foreground"
      >
        Understand the structure before evaluating the opportunity.
      </motion.footer>
    </div>
  );
}
