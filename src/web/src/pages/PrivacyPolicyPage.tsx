import { MainLayout } from '../components/layout/MainLayout';

export function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 p-8">
          <h1 className="text-3xl font-bold text-neutral-100 mb-6">Privacy Policy</h1>
          <div className="prose prose-invert max-w-none">
            <p className="text-neutral-300 mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-200 mb-4">1. Introduction</h2>
              <p className="text-neutral-400 leading-relaxed">
                Welcome to Parc Fermé. We respect your privacy and are committed to protecting your personal data.
                This privacy policy will inform you as to how we look after your personal data when you visit our website
                and tell you about your privacy rights and how the law protects you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-200 mb-4">2. Data We Collect</h2>
              <p className="text-neutral-400 leading-relaxed mb-4">
                We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
              </p>
              <ul className="list-disc pl-6 text-neutral-400 space-y-2">
                <li><strong className="text-neutral-300">Identity Data</strong> includes first name, last name, username or similar identifier.</li>
                <li><strong className="text-neutral-300">Contact Data</strong> includes email address.</li>
                <li><strong className="text-neutral-300">Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform and other technology on the devices you use to access this website.</li>
                <li><strong className="text-neutral-300">Usage Data</strong> includes information about how you use our website, products and services (such as race logs and reviews).</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-200 mb-4">3. How We Use Your Data</h2>
              <p className="text-neutral-400 leading-relaxed">
                We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-neutral-400 space-y-2 mt-4">
                <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
                <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                <li>Where we need to comply with a legal or regulatory obligation.</li>
              </ul>
            </section>

            <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-700/50 mt-8">
              <p className="text-sm text-neutral-500 italic">
                Note: This is a provisional privacy policy for the development phase of Parc Fermé. 
                A complete legal policy will be established prior to public launch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
