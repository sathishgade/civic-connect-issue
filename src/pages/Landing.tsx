import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import {
  FileText,
  MessageSquare,
  Camera,
  Mic,
  MapPin,
  QrCode,
  Shield,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  ChevronRight
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    titleKey: 'feature.form.title',
    descKey: 'feature.form.desc',
  },
  {
    icon: MessageSquare,
    titleKey: 'feature.chatbot.title',
    descKey: 'feature.chatbot.desc',
  },
  {
    icon: Camera,
    titleKey: 'feature.image.title',
    descKey: 'feature.image.desc',
  },
  {
    icon: Mic,
    titleKey: 'feature.voice.title',
    descKey: 'feature.voice.desc',
  },
  {
    icon: MapPin,
    titleKey: 'feature.track.title',
    descKey: 'feature.track.desc',
  },
  {
    icon: QrCode,
    titleKey: 'feature.qr.title',
    descKey: 'feature.qr.desc',
  },
];

const steps = [
  {
    number: '01',
    title: 'Report Issue',
    description: 'Use form, chatbot, image upload, or voice to report civic issues',
  },
  {
    number: '02',
    title: 'AI Processing',
    description: 'Our AI analyzes and categorizes your complaint automatically',
  },
  {
    number: '03',
    title: 'Assignment',
    description: 'Issue gets assigned to the right department and employee',
  },
  {
    number: '04',
    title: 'Resolution',
    description: 'Track progress and verify resolution with QR code',
  },
];

export default function Landing() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState([
    { value: '0', label: 'Issues Reported' },
    { value: '0', label: 'Issues Resolved' },
    { value: '0', label: 'Field Workers' },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const complaintsColl = collection(db, 'complaints');
        const usersColl = collection(db, 'users');

        // Total Issues
        const totalSnapshot = await getCountFromServer(complaintsColl);
        const totalIssues = totalSnapshot.data().count;

        // Resolved Issues
        const resolvedQuery = query(complaintsColl, where('status', '==', 'resolved'));
        const resolvedSnapshot = await getCountFromServer(resolvedQuery);
        const resolvedIssues = resolvedSnapshot.data().count;

        // Field Workers
        const employeesQuery = query(usersColl, where('role', '==', 'employee'));
        const employeesSnapshot = await getCountFromServer(employeesQuery);
        const employees = employeesSnapshot.data().count;

        setStats([
          { value: `${totalIssues}+`, label: 'Issues Reported' },
          { value: `${resolvedIssues}+`, label: 'Issues Resolved' },
          { value: `${employees}+`, label: 'Field Workers' },
        ]);
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Fallback to mock stats if permissions fail or network error
        setStats([
          { value: '1,240+', label: 'Issues Reported' },
          { value: '850+', label: 'Issues Resolved' },
          { value: '45+', label: 'Field Workers' },
        ]);
      }
    };

    fetchStats();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="container-civic py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-sm font-medium mb-8 animate-fade-in">
              <Shield className="h-4 w-4" />
              <span>Government Authorized Platform</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-slide-up text-balance">
              {t('landing.title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              {t('landing.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button
                variant="hero"
                size="xl"
                onClick={() => navigate('/complaint/new')}
                className="group"
              >
                {t('landing.cta')}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="civic-outline"
                size="xl"
                onClick={() => navigate('/login')}
              >
                {t('complaint.track')}
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pt-16 border-t border-border animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-civic bg-card">
        <div className="container-civic">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('landing.features')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Multiple ways to report issues - designed for everyone, including illiterate users
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card-civic-elevated group cursor-pointer hover:border-primary/30"
                onClick={() => {
                  if (feature.titleKey === 'feature.voice.title') {
                    navigate('/complaint/new');
                  }
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-muted-foreground">
                  {t(feature.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-civic">
        <div className="container-civic">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('landing.howItWorks')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple 4-step process from reporting to resolution
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-primary/10 mb-4">{step.number}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                {index < steps.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-8 -right-4 h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-civic">
        <div className="container-civic text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to make your city better?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of citizens who are actively improving their neighborhoods
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="civic-white"
              size="xl"
              onClick={() => navigate('/register')}
              className="group"
            >
              Get Started
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="hero-outline"
              size="xl"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
