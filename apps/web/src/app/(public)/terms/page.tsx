import Link from "next/link"

export const metadata = {
  title: "Terms of Service - Swashbuckler",
}

export default function TermsOfServicePage() {
  return (
    <>
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Swashbuckler
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign In
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: March 3, 2026
        </p>

        <div className="mt-8 space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Agreement to Terms
            </h2>
            <p className="mt-2">
              By accessing or using Swashbuckler, you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not
              use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Description of Service
            </h2>
            <p className="mt-2">
              Swashbuckler is a personal knowledge-base and note-taking
              application. We provide tools for creating, organizing, and sharing
              notes and other content. The service is available both as a
              cloud-hosted experience with an account and as a local guest mode
              that stores data in your browser.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Your Account
            </h2>
            <p className="mt-2">
              You are responsible for maintaining the security of your account
              credentials. You agree to provide accurate information when
              creating an account and to keep your login details confidential. You
              are responsible for all activity that occurs under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Your Content
            </h2>
            <p className="mt-2">
              You retain full ownership of any content you create using
              Swashbuckler. We do not claim any intellectual property rights over
              your notes, entries, or other materials. You are solely responsible
              for the content you create and share through the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Your Data &amp; Privacy
            </h2>
            <p className="mt-2">
              We will never sell, rent, or trade your personal data to third
              parties. Your data is used solely to provide and improve the
              Swashbuckler service. For full details on how we handle your
              information, please review our{" "}
              <Link
                href="/privacy"
                className="text-primary underline hover:text-primary/80 transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Acceptable Use
            </h2>
            <p className="mt-2">You agree not to use Swashbuckler to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Violate any applicable laws or regulations</li>
              <li>
                Store or distribute malicious software, harmful code, or content
                that infringes on the rights of others
              </li>
              <li>
                Attempt to gain unauthorized access to the service, other
                accounts, or related systems
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                service
              </li>
              <li>
                Use the service for any purpose that is fraudulent or deceptive
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Shared Spaces
            </h2>
            <p className="mt-2">
              When you share a space with other users, they will have access to
              the content within that space according to the permissions you
              grant. You are responsible for managing access to your shared
              spaces and for the content shared within them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Service Availability
            </h2>
            <p className="mt-2">
              We strive to keep Swashbuckler available and reliable, but we do
              not guarantee uninterrupted access. The service may be temporarily
              unavailable for maintenance, updates, or circumstances beyond our
              control. We are not liable for any loss or inconvenience caused by
              downtime.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Account Termination
            </h2>
            <p className="mt-2">
              You may delete your account at any time through the application
              settings. We reserve the right to suspend or terminate accounts
              that violate these terms. Upon account deletion, your data will be
              permanently removed from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Limitation of Liability
            </h2>
            <p className="mt-2">
              Swashbuckler is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo; without warranties of any kind, either express or
              implied. To the fullest extent permitted by law, we shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Changes to These Terms
            </h2>
            <p className="mt-2">
              We may update these Terms of Service from time to time. Any changes
              will be reflected on this page with an updated date. Continued use
              of the service after changes constitutes acceptance of the revised
              terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              If you have questions about these terms, please open an issue on
              our{" "}
              <a
                href="https://github.com/bencohendev/swashbuckler"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80 transition-colors"
              >
                GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
