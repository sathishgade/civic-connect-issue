import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { 
  Complaint, 
  ComplaintStatus, 
  DashboardStats,
  CATEGORY_LABELS,
  STATUS_LABELS
} from '@/types';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

// Mock data for demo
const mockComplaints: Complaint[] = [
  {
    id: '1',
    userId: '1',
    title: 'Pothole on Main Street',
    description: 'Large pothole causing traffic issues',
    category: 'road',
    status: 'in_progress',
    priority: 'high',
    location: {
      latitude: 17.3850,
      longitude: 78.4867,
      address: 'Main Street, Hyderabad',
      area: 'Banjara Hills',
    },
    images: [],
    assignedTo: '3',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    userId: '1',
    title: 'Garbage not collected',
    description: 'Garbage not collected for 3 days',
    category: 'garbage',
    status: 'pending',
    priority: 'medium',
    location: {
      latitude: 17.4100,
      longitude: 78.4750,
      address: '12th Street, Jubilee Hills',
      area: 'Jubilee Hills',
    },
    images: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    userId: '1',
    title: 'Street light not working',
    description: 'Street light near park entrance is broken',
    category: 'streetlight',
    status: 'resolved',
    priority: 'low',
    location: {
      latitude: 17.4200,
      longitude: 78.4600,
      address: 'Park Road, Madhapur',
      area: 'Madhapur',
    },
    images: [],
    qrCode: 'QR123456',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const mockStats: DashboardStats = {
  totalComplaints: 3,
  pendingComplaints: 1,
  inProgressComplaints: 1,
  resolvedComplaints: 1,
  avgResolutionTime: 48,
};

const statusConfig: Record<ComplaintStatus, { icon: typeof Clock; color: string; bgClass: string }> = {
  pending: { icon: Clock, color: 'text-status-pending', bgClass: 'status-pending' },
  in_progress: { icon: AlertCircle, color: 'text-status-in-progress', bgClass: 'status-in-progress' },
  resolved: { icon: CheckCircle2, color: 'text-status-resolved', bgClass: 'status-resolved' },
  closed: { icon: CheckCircle2, color: 'text-status-closed', bgClass: 'status-closed' },
};

export default function CitizenDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);
  const [stats, setStats] = useState<DashboardStats>(mockStats);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="container-civic py-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t('dashboard.welcome')}, {user.name}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your civic complaints
            </p>
          </div>
          <Button 
            variant="civic" 
            size="lg"
            onClick={() => navigate('/complaint/new')}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            {t('nav.newComplaint')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalComplaints}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.totalComplaints')}</p>
              </div>
            </div>
          </div>

          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-pending/10 text-status-pending">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pendingComplaints}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.pending')}</p>
              </div>
            </div>
          </div>

          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-in-progress/10 text-status-in-progress">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.inProgressComplaints}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.inProgress')}</p>
              </div>
            </div>
          </div>

          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-resolved/10 text-status-resolved">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.resolvedComplaints}</p>
                <p className="text-sm text-muted-foreground">{t('dashboard.resolved')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Complaints List */}
        <div className="card-civic">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">{t('dashboard.recentComplaints')}</h2>
          </div>

          {complaints.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No complaints yet</h3>
              <p className="text-muted-foreground mb-4">Start by reporting your first civic issue</p>
              <Button variant="civic" onClick={() => navigate('/complaint/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint) => {
                const StatusIcon = statusConfig[complaint.status].icon;
                const categoryInfo = CATEGORY_LABELS[complaint.category];
                const statusLabel = STATUS_LABELS[complaint.status][language];

                return (
                  <div
                    key={complaint.id}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/complaint/${complaint.id}`)}
                  >
                    {/* Category Icon */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl flex-shrink-0">
                      {categoryInfo.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {complaint.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {complaint.description}
                          </p>
                        </div>
                        <span className={statusConfig[complaint.status].bgClass}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusLabel}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {complaint.location.area || complaint.location.address}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {formatDate(complaint.createdAt)}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors hidden md:block" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
