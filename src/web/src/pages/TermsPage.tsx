import { MainLayout } from '../components/layout/MainLayout';

export function TermsPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-8">
          <h1 className="text-3xl font-bold text-neutral-100 mb-6">Terms of Service</h1>
          <div className="prose prose-invert max-w-none">
            <p className="text-neutral-300 mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-200 mb-4">1. Agreement to Terms</h2>
              <p className="text-neutral-400 leading-relaxed">
                By accessing or using Parc Fermé, you agree to be bound by these Terms of Service and our Privacy Policy.
                If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-200 mb-4">2. Intellectual Property Rights</h2>
              <p className="text-neutral-400 leading-relaxed mb-4">
                Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-200 mb-4">3. User Representations</h2>
              <p className="text-neutral-400 leading-relaxed mb-4">
                By using the Site, you represent and warrant that:
              </p>
              <ul className="list-disc pl-6 text-neutral-400 space-y-2">
                <li>All registration information you submit will be true, accurate, current, and complete.</li>
                <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
                <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
                <li>You will not access the Site through automated or non-human means, whether through a bot, script or otherwise.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-200 mb-4">4. Spoiler Protection</h2>
              <p className="text-neutral-400 leading-relaxed">
                Parc Fermé is designed to help users avoid spoilers. While we employ various technical measures ("Spoiler Shield") to obscure results, we cannot guarantee that you will never encounter a spoiler while using the service. You agree that Parc Fermé is not liable for any enjoyment lost due to accidental spoilers.
              </p>
            </section>

            <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-700/50 mt-8">
              <p className="text-sm text-neutral-500 italic">
                Note: This is a provisional terms of service document for the development phase of Parc Fermé. 
                A complete legal document will be established prior to public launch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
