import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ROUTES } from '../types/navigation';

// =========================
// FAQ Data
// =========================

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is Parc Fermé?',
    answer:
      'Parc Fermé is a social cataloging platform for motorsport fans. Think of it as "Letterboxd for racing"—a place where you can log races you\'ve watched or attended, rate and review them, create curated lists, and connect with fellow fans.',
  },
  {
    question: 'Is Parc Fermé free to use?',
    answer:
      'Yes! Parc Fermé offers a generous free tier that includes access to all historical race data, logging capabilities, and community features. We believe motorsport history should be accessible to everyone. Premium features (PaddockPass) may be offered in the future for advanced statistics and exclusive features.',
  },
  {
    question: 'What is the Spoiler Shield?',
    answer:
      'The Spoiler Shield is our core feature that helps you avoid race spoilers. By default, race results are hidden until you log that you\'ve watched them. You can adjust your spoiler preferences to Strict (hide all results), Moderate (hide recent races), or None (show everything).',
  },
  {
    question: 'What\'s the difference between "Watched" and "Attended"?',
    answer:
      'This is what makes Parc Fermé unique! "Watched" captures your experience of viewing a race on TV or streaming—the narrative, action, and broadcast quality. "Attended" captures the live venue experience—atmosphere, facilities, seat views, and the overall event. You can rate both separately for any race.',
  },
  {
    question: 'Which racing series does Parc Fermé support?',
    answer:
      'We\'re launching with full Formula 1 coverage (2024-2025 initially, with historical data coming soon). Our architecture supports MotoGP, IndyCar, and WEC, which will be added through community contributions. If you\'re passionate about a series, we\'d love your help!',
  },
  {
    question: 'How is race data sourced?',
    answer:
      'We primarily use the OpenF1 API for current F1 data. Historical data comes from various open sources including the Ergast archive. For non-F1 series, we rely on community contributions following a "Wiki" model.',
  },
  {
    question: 'Can I contribute venue reviews and seat photos?',
    answer:
      'Absolutely! Crowdsourced venue data is a core part of our mission. When you log an attended race, you can add seat location, view photos, and rate facilities. This helps other fans plan their track visits.',
  },
  {
    question: 'Is Parc Fermé affiliated with any racing series?',
    answer:
      'No. Parc Fermé is an independent, fan-built platform. We are not affiliated with Formula One, FIA, MotoGP, IndyCar, or any other racing organization. All trademarks belong to their respective owners.',
  },
  {
    question: 'How can I support Parc Fermé?',
    answer:
      'The best way to support us is to use the platform, share it with fellow fans, and contribute to the community. You can also help by contributing to non-F1 series data, reporting bugs, and providing feedback. In the future, PaddockPass subscriptions will help fund development.',
  },
  {
    question: 'I found a bug or have a feature suggestion. Where do I report it?',
    answer:
      'We\'d love to hear from you! Please reach out via our community channels (coming soon) or through the contact options on this page. Your feedback helps make Parc Fermé better for everyone.',
  },
];

// =========================
// FAQ Item Component
// =========================

function FAQItemComponent({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left hover:bg-neutral-800/30 transition-colors px-4 -mx-4"
      >
        <span className="text-neutral-200 font-medium pr-4">{item.question}</span>
        <span
          className={`text-2xl text-pf-green transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-neutral-400 leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
}

// =========================
// Main About Page
// =========================

export function AboutPage() {
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-neutral-100 mb-6">
            About <span className="brand-logo">Parc Fermé</span>
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Your personal motorsport diary. Log races, rate experiences, and connect with fellow fans worldwide.
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-16">
          <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-8">
            <h2 className="text-2xl font-bold text-neutral-100 mb-6 flex items-center gap-3">
              <span className="text-3xl">🏁</span>
              Our Mission
            </h2>
            <div className="space-y-4 text-neutral-400 leading-relaxed">
              <p>
                Motorsport fans experience races in a way that's profoundly different from any other sport.
                The tension of a strategic duel, the atmosphere of a rainy afternoon at Spa-Francorchamps,
                or the specific nostalgia of a classic race re-watched years later—these experiences
                deserve to be captured, cataloged, and shared.
              </p>
              <p>
                Yet until now, there's been no centralized "cultural memory" for racing fans. No place
                to track your journey through the sport, curate your history, or discover what to
                watch next through trusted recommendations from fellow enthusiasts.
              </p>
              <p>
                <strong className="text-neutral-200">Parc Fermé fills this gap.</strong> We're building
                the definitive platform for motorsport fans to log every race they watch or attend,
                rate both the broadcast experience and the live venue atmosphere, and connect with
                a global community of racing enthusiasts.
              </p>
            </div>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-100 mb-8 text-center">
            What Makes Us Different
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Spoiler Shield */}
            <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6 text-center">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-lg font-semibold text-neutral-200 mb-2">Spoiler Shield</h3>
              <p className="text-sm text-neutral-500">
                Results hidden by default. Watch races on your own time without fear of spoilers.
              </p>
            </div>

            {/* Dual Rating */}
            <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6 text-center">
              <div className="text-4xl mb-4">📺 🏟️</div>
              <h3 className="text-lg font-semibold text-neutral-200 mb-2">Watched vs. Attended</h3>
              <p className="text-sm text-neutral-500">
                Rate both the broadcast quality AND the live venue experience separately.
              </p>
            </div>

            {/* Free History */}
            <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-6 text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-lg font-semibold text-neutral-200 mb-2">Free Forever</h3>
              <p className="text-sm text-neutral-500">
                All historical race data is free. We believe motorsport history belongs to everyone.
              </p>
            </div>
          </div>
        </section>

        {/* The Story */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-pf-green/10 to-pf-blue/10 rounded-xl border border-neutral-800 p-8">
            <h2 className="text-2xl font-bold text-neutral-100 mb-6 flex items-center gap-3">
              <span className="text-3xl">💡</span>
              The Story
            </h2>
            <div className="space-y-4 text-neutral-400 leading-relaxed">
              <p>
                Parc Fermé was born from a simple frustration: after years of watching Formula 1,
                there was no good way to look back and remember which races were worth the time.
                Sure, you could search Reddit threads or check statistics, but those don't capture
                the <em className="text-neutral-300">feeling</em> of a race.
              </p>
              <p>
                We wanted something like Letterboxd—but for motorsport. A place to log our racing
                journey, track our history, and discover hidden gems recommended by people with
                similar taste. Not just cold statistics, but the subjective human experience of
                racing.
              </p>
              <p>
                So we built it. And now we're inviting you to join us.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-16">
          <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-8">
            <h2 className="text-2xl font-bold text-neutral-100 mb-8 flex items-center gap-3">
              <span className="text-3xl">❓</span>
              Frequently Asked Questions
            </h2>
            <div className="divide-neutral-800">
              {faqs.map((faq, index) => (
                <FAQItemComponent
                  key={index}
                  item={faq}
                  isOpen={openFAQIndex === index}
                  onToggle={() => toggleFAQ(index)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-pf-red/20 via-pf-green/20 to-pf-blue/20 rounded-xl border border-neutral-800 p-8">
            <h2 className="text-2xl font-bold text-neutral-100 mb-4">
              Ready to Start Your Racing Diary?
            </h2>
            <p className="text-neutral-400 mb-6 max-w-lg mx-auto">
              Join our community of motorsport enthusiasts. Log your first race today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={ROUTES.REGISTER}
                className="inline-flex items-center justify-center px-6 py-3 bg-pf-green text-neutral-950 font-medium rounded-lg hover:bg-pf-green-400 transition-colors"
              >
                Create Free Account
              </Link>
              <Link
                to={ROUTES.SERIES_LIST}
                className="inline-flex items-center justify-center px-6 py-3 bg-neutral-800 text-neutral-200 font-medium rounded-lg border border-neutral-700 hover:bg-neutral-700 transition-colors"
              >
                Browse Races
              </Link>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-16 text-center">
          <p className="text-neutral-500 text-sm">
            Have questions or feedback? We'd love to hear from you.
          </p>
          <p className="text-neutral-500 text-sm mt-2">
            Contact us at{' '}
            <a
              href="mailto:hello@parcferme.com"
              className="text-pf-green hover:text-pf-green-400 transition-colors"
            >
              hello@parcferme.com
            </a>
          </p>
        </section>
      </div>
    </MainLayout>
  );
}
