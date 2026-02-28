import Link from "next/link"

export const metadata = {
  title: "Privacy Policy - Swashbuckler",
}

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: February 27, 2026
        </p>

        <div className="mt-8 space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Overview</h2>
            <p className="mt-2">
              Swashbuckler is a personal knowledge-base and note-taking application.
              We are committed to protecting your privacy and being transparent about
              the data we collect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Information We Collect
            </h2>

            <h3 className="mt-4 font-medium text-foreground">Account data</h3>
            <p className="mt-1">
              When you create an account, we collect your email address and an
              encrypted password. This information is managed by Supabase, our
              authentication and database provider.
            </p>

            <h3 className="mt-4 font-medium text-foreground">Your content</h3>
            <p className="mt-1">
              Notes, entries, custom types, templates, and other content you create
              are stored in our Supabase-hosted database. This data belongs to you
              and is only accessible to you and anyone you explicitly share a space
              with.
            </p>

            <h3 className="mt-4 font-medium text-foreground">Guest mode data</h3>
            <p className="mt-1">
              If you use Swashbuckler as a guest, your data is stored locally in
              your browser (IndexedDB). No data is sent to our servers in guest
              mode.
            </p>

            <h3 className="mt-4 font-medium text-foreground">Analytics</h3>
            <p className="mt-1">
              We use Vercel Analytics to collect anonymous, aggregated usage data
              such as page views and performance metrics. This data does not
              identify individual users and contains no personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Cookies &amp; Local Storage
            </h2>
            <p className="mt-2">
              We use cookies for authentication sessions and a guest-mode
              preference cookie. We also use browser localStorage to remember your
              selected space and UI preferences such as theme settings. We do not
              use third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              How We Use Your Data
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>To provide and maintain the Swashbuckler service</li>
              <li>To authenticate your identity and secure your account</li>
              <li>To enable real-time collaboration in shared spaces</li>
              <li>To improve the application based on aggregated usage patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Data Sharing
            </h2>
            <p className="mt-2">
              We do not sell, rent, or share your personal data with third parties.
              Your data is only processed by the following service providers that
              are essential to running the application:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Supabase</strong> &mdash;
                authentication, database, and real-time infrastructure
              </li>
              <li>
                <strong className="text-foreground">Vercel</strong> &mdash;
                hosting and anonymous analytics
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Data Retention &amp; Deletion
            </h2>
            <p className="mt-2">
              Your data is retained for as long as you have an active account. You
              can delete your content at any time from within the application. If
              you wish to delete your account and all associated data, please
              contact us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Security</h2>
            <p className="mt-2">
              We use industry-standard security measures including encrypted
              connections (HTTPS), row-level security policies on our database, and
              secure authentication flows. Passwords are hashed and never stored in
              plain text.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this privacy policy from time to time. Any changes will
              be reflected on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              If you have questions about this privacy policy, please open an issue
              on our{" "}
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
