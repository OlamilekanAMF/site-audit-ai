import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Stethoscope,
  Zap,
  Search,
  Shield,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Globe,
  FileText,
  Star,
  Quote,
  Sun,
  Moon,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Performance Audit",
    description: "Deep analysis of page speed, Core Web Vitals, and load-time bottlenecks with actionable fixes.",
  },
  {
    icon: Search,
    title: "SEO Analysis",
    description: "Comprehensive check of meta tags, headings, content structure, and search engine optimization.",
  },
  {
    icon: Shield,
    title: "Security Check",
    description: "Scan for common vulnerabilities, HTTPS issues, and security best practices compliance.",
  },
  {
    icon: BarChart3,
    title: "AI-Powered Insights",
    description: "Get intelligent recommendations prioritized by impact, powered by advanced AI models.",
  },
  {
    icon: Globe,
    title: "Accessibility Review",
    description: "Ensure your site is usable by everyone with WCAG compliance checks and suggestions.",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    description: "Export branded, professional audit reports to share with clients and stakeholders.",
  },
];

const steps = [
  {
    step: "01",
    title: "Enter Your URL",
    desc: "Paste any website URL into our scanner — no installation or setup required.",
  },
  {
    step: "02",
    title: "AI Analyzes Everything",
    desc: "Our engine crawls your site and runs 50+ checks across performance, SEO, and security.",
  },
  {
    step: "03",
    title: "Get Your Report",
    desc: "Receive a detailed audit with scores, prioritized fixes, and downloadable PDF reports.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out SiteDoctor AI",
    features: ["3 scans per month", "Basic audit report", "SEO analysis", "Email support"],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For professionals who need deeper insights",
    features: [
      "Unlimited scans",
      "Full audit report",
      "Performance + SEO + Security",
      "PDF export",
      "Report history",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "per month",
    description: "For teams and agencies at scale",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "API access",
      "White-label reports",
      "Custom integrations",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Frontend Lead at Vercel",
    quote: "SiteDoctor AI cut our audit time from hours to minutes. The AI suggestions are surprisingly accurate and actionable.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "SEO Director at Growth.io",
    quote: "We use SiteDoctor for every client onboarding. The PDF reports look professional and the insights are spot-on.",
    rating: 5,
  },
  {
    name: "Aisha Patel",
    role: "Founder of DesignCraft",
    quote: "Finally, a tool that combines performance, SEO, and accessibility in one scan. It's become essential to our workflow.",
    rating: 5,
  },
];

const faqs = [
  {
    q: "How does SiteDoctor AI work?",
    a: "Simply enter any website URL, and our AI-powered engine will crawl the page, run 50+ checks across performance, SEO, accessibility, and security, then generate a detailed report with prioritized recommendations.",
  },
  {
    q: "Is there a free plan available?",
    a: "Yes! Our free plan includes 3 scans per month with basic audit reports and SEO analysis. No credit card required to get started.",
  },
  {
    q: "How accurate are the AI suggestions?",
    a: "Our AI models are trained on millions of web performance patterns and continuously updated. Suggestions are prioritized by potential impact and include specific code-level fixes when applicable.",
  },
  {
    q: "Can I export reports as PDF?",
    a: "Absolutely. Pro and Enterprise plans include branded PDF export with your company details, scores, and all recommendations — perfect for sharing with clients or stakeholders.",
  },
  {
    q: "Do you scan single pages or entire websites?",
    a: "Currently, each scan analyzes a single page URL. Multi-page crawling and site-wide audits are available on the Enterprise plan.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We only analyze publicly accessible pages. All scan data is encrypted in transit and at rest, and you can delete your reports at any time.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Index = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold">SiteDoctor AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle dark mode"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-28 lg:py-40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/6" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <Zap className="h-3.5 w-3.5 text-accent" />
              AI-Powered Website Audits — Trusted by 10,000+ developers
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
              Instantly Analyze Your
              <br />
              <span className="text-primary">Website Performance & SEO</span>
              <br />
              with AI
            </h1>
            <p className="mx-auto max-w-2xl text-lg lg:text-xl text-muted-foreground mb-10">
              Scan any website and get detailed performance insights and AI-powered optimization suggestions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="gap-2 text-base h-12 px-8">
                  Start Free Website Scan <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="text-base h-12 px-8">
                  See How It Works
                </Button>
              </a>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">No credit card required · Free forever plan</p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-wider">Features</Badge>
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
              Everything you need to optimize your website
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Comprehensive analysis across performance, SEO, security, accessibility, and best practices.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                variants={fadeUp}
                viewport={{ once: true }}
              >
                <Card className="h-full bg-card hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-wider">How It Works</Badge>
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">Three steps to a healthier website</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            {steps.map((item, i) => (
              <motion.div
                key={item.step}
                className="text-center relative"
                custom={i}
                initial="hidden"
                whileInView="visible"
                variants={fadeUp}
                viewport={{ once: true }}
              >
                <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-display text-2xl font-bold mx-auto mb-5">
                  {item.step}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-border" />
                )}
                <h3 className="font-display font-semibold text-xl mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-wider">Pricing</Badge>
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Choose the plan that fits your needs. Upgrade or downgrade anytime.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                variants={fadeUp}
                viewport={{ once: true }}
              >
                <Card
                  className={`relative flex flex-col h-full ${
                    plan.popular ? "border-primary shadow-xl shadow-primary/10 scale-[1.03]" : ""
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  )}
                  <CardHeader>
                    <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="font-display text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground ml-1">/{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Link to="/login" className="w-full">
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-wider">Testimonials</Badge>
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">Loved by developers worldwide</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                variants={fadeUp}
                viewport={{ once: true }}
              >
                <Card className="h-full bg-card">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <Quote className="h-6 w-6 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-foreground leading-relaxed mb-6">{t.quote}</p>
                    <div>
                      <p className="font-display font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-wider">FAQ</Badge>
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">Frequently asked questions</h2>
          </motion.div>
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left font-display font-medium">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/4 to-accent/6" />
        <div className="container mx-auto px-4 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl lg:text-5xl font-bold mb-6">
              Ready to improve your website?
            </h2>
            <p className="text-muted-foreground mb-10 max-w-lg mx-auto text-lg">
              Join thousands of developers and businesses using SiteDoctor AI to build faster, more optimized websites.
            </p>
            <Link to="/login">
              <Button size="lg" className="gap-2 text-base h-12 px-8">
                Start Free Website Scan <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-5 text-sm text-muted-foreground">No credit card required · Setup in 30 seconds</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold">SiteDoctor AI</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
          </div>
          <span>© {new Date().getFullYear()} SiteDoctor AI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
