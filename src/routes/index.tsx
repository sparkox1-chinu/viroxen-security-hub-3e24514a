import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileCheck2, Fingerprint, Layers, Radar, ShieldCheck, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/Reveal";
import { HeroShield } from "@/components/motion/HeroShield";
import { formatPostDate, posts } from "@/lib/site-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VIROXEN — Evidence-based cybersecurity for engineering teams" },
      {
        name: "description",
        content:
          "Security audits, in-house security products, and applied research. Aligned with OWASP and CVSS. No fear, no hype — just findings you can act on.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Home,
});

function Home() {
  return (
    <SiteLayout>
      <Hero />
      <TrustStrip />
      <Pillars />
      <WhyVX />
      <Research />
      <CaseStudies />
      <CTA />
    </SiteLayout>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="grid-bg absolute inset-0" aria-hidden="true" />
      <div
        className="absolute left-1/2 top-0 h-[560px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--color-primary)" }}
        aria-hidden="true"
      />
      <HeroShield />
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal y={12} duration={0.5}>
            <Badge
              variant="outline"
              className="mb-6 rounded-full border-border/80 bg-background/60 px-3 py-1 text-xs font-medium tracking-wider text-muted-foreground"
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Independent cybersecurity engineering
            </Badge>
          </Reveal>
          <Reveal y={18} duration={0.55} delay={0.05}>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Reduce risk before it reaches{" "}
              <span className="text-gradient-brand">production.</span>
            </h1>
          </Reveal>
          <Reveal y={14} duration={0.5} delay={0.12}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              VIROXEN delivers structured security assessments, in-house security tooling, and
              applied research — with reports engineered for engineers, not marketing decks.
            </p>
          </Reveal>
          <Reveal y={12} duration={0.5} delay={0.2}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/book">
                <Button size="lg" className="w-full hover-lift sm:w-auto">
                  Request a Security Audit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/products">
                <Button size="lg" variant="outline" className="w-full hover-lift sm:w-auto">
                  Explore our tools
                </Button>
              </Link>
            </div>
          </Reveal>
          <p className="mt-6 text-xs text-muted-foreground">
            OWASP ASVS · OWASP Top 10 · CVSS-aligned reporting
          </p>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = ["OWASP", "ASVS L2", "CVSS 3.1", "CWE", "PTES", "ISO 27001 aware"];
  return (
    <section className="border-b border-border/60 bg-muted/20 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Methodologies we align with
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {items.map((i) => (
            <span key={i} className="text-sm font-medium tracking-wide text-muted-foreground">
              {i}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  const p = [
    {
      icon: ShieldCheck,
      title: "Security Audit Services",
      body: "Structured web, API, and infrastructure assessments. Manual verification, CVSS scoring, and remediation-first reports.",
      to: "/services",
    },
    {
      icon: Terminal,
      title: "Cybersecurity Products",
      body: "Free and paid security tooling built and maintained by our team, released for the security community and clients.",
      to: "/products",
    },
    {
      icon: Radar,
      title: "Applied Research",
      body: "Vulnerability analysis, secure coding notes, and threat intelligence — grounded, calm, and citation-ready.",
      to: "/research",
    },
  ] as const;
  return (
    <section className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Three pillars</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            One security engineering practice, three ways to work with us.
          </h2>
        </div>
        <RevealStagger className="mt-12 grid gap-6 md:grid-cols-3">
          {p.map((item) => (
            <RevealItem key={item.title}>
              <Link
                to={item.to}
                className="card-lift group relative block h-full overflow-hidden rounded-xl border border-border/60 bg-card p-7 transition-colors hover:border-primary/40"
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border/70 bg-background text-primary">
                  <item.icon className="h-5 w-5" strokeWidth={1.6} />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                <div className="mt-6 inline-flex items-center text-sm font-medium text-primary">
                  Learn more <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}

function WhyVX() {
  const items = [
    {
      icon: FileCheck2,
      title: "Evidence-based reports",
      body: "Every finding includes reproduction steps, impact analysis, and a remediation path — not just a screenshot.",
    },
    {
      icon: Layers,
      title: "Aligned with recognized frameworks",
      body: "OWASP Top 10, OWASP ASVS Level 2, CVSS 3.1 scoring, and CWE references across engagement types.",
    },
    {
      icon: Fingerprint,
      title: "Manual verification",
      body: "Automated tools discover; our engineers verify. No false-positive dumps sent to your inbox.",
    },
    {
      icon: ShieldCheck,
      title: "Calm, honest communication",
      body: "No fear-based marketing, no exaggerated claims, no fabricated findings. If it isn't broken, we say so.",
    },
  ];
  return (
    <section className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Why VIROXEN</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              A practice built for engineers who ship.
            </h2>
            <p className="mt-5 text-muted-foreground">
              We work the way software teams work: predictable scope, reproducible findings, and
              deliverables you can hand directly to a developer.
            </p>
          </div>
          <RevealStagger className="grid gap-6 sm:grid-cols-2 lg:col-span-2">
            {items.map((i) => (
              <RevealItem key={i.title} className="card-lift rounded-xl border border-border/60 bg-card p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background text-primary">
                  <i.icon className="h-5 w-5" strokeWidth={1.6} />
                </div>
                <h3 className="font-semibold text-foreground">{i.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{i.body}</p>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </div>
    </section>
  );
}

function Research() {
  const featured = posts.slice(0, 3);
  return (
    <section className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              Recent research
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Notes from the team.
            </h2>
          </div>
          <Link to="/research" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex">
            View all research →
          </Link>
        </div>
        <RevealStagger className="mt-10 grid gap-6 md:grid-cols-3">
          {featured.map((post) => (
            <RevealItem key={post.slug}>
              <Link
                to="/research/$slug"
                params={{ slug: post.slug }}
                className="card-lift group block h-full rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] uppercase tracking-wider">
                      {t}
                    </Badge>
                  ))}
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-snug text-foreground group-hover:text-primary">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                <p className="mt-5 text-xs text-muted-foreground">
                  {post.author} · {formatPostDate(post.date)}
                </p>
              </Link>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}

function CaseStudies() {
  return (
    <section className="border-b border-border/60 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Selected work</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Case studies in preparation.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Client engagements are covered under strict confidentiality. Anonymized case studies
            will be published here as they are approved for release.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 text-sm text-muted-foreground"
            >
              Case study coming soon
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-10 text-center sm:p-14">
          <div className="grid-bg absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Start with a free Community security scan.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              One domain, one website, delivered in 2–3 business days. No credit card, no
              commitment.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/book">
                <Button size="lg">Request Free Scan</Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="ghost">
                  Compare all plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
