import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Complaint,
  ComplaintStatus,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from '@/types';
import { toast } from 'sonner';
import {
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Navigation,
  QrCode,
  Camera,
  ChevronRight,
} from 'lucide-react';

// Mock assigned complaints for employee
const mockAssignedComplaints: Complaint[] = [
  {
    id: '1',
    userId: '1',
    title: 'Pothole on Main Street',
    description: 'Large pothole near the bus stop causing accidents. Needs immediate attention.',
    category: 'road',
    status: 'in_progress',
    priority: 'high',
    location: {
      latitude: 17.385,
      longitude: 78.4867,
      address: 'Main Street, Near Bus Stop',
      area: 'Banjara Hills',
    },
    images: [],
    assignedTo: '3',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
  {
    id: '2',
    userId: '2',
    title: 'Garbage overflow at Market',
    description: 'Garbage bins overflowing for 4 days. Bad smell affecting nearby shops.',
    category: 'garbage',
    status: 'in_progress',
    priority: 'medium',
    location: {
      latitude: 17.41,
      longitude: 78.475,
      address: 'Market Road, Shop No. 45',
      area: 'Jubilee Hills',
    },
    images: [],
    assignedTo: '3',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
  {
    id: '3',
    userId: '3',
    title: 'Street light not working',
    description: 'Street light near colony entrance has been broken for a week.',
    category: 'streetlight',
    status: 'in_progress',
    priority: 'low',
    location: {
      latitude: 17.43,
      longitude: 78.45,
      address: 'Colony Entrance, Gate 2',
      area: 'Gachibowli',
    },
    images: [],
    assignedTo: '3',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
];

const statusConfig: Record<ComplaintStatus, { icon: typeof Clock; color: string; bgClass: string }> = {
  pending: { icon: Clock, color: 'text-status-pending', bgClass: 'status-pending' },
  in_progress: { icon: AlertCircle, color: 'text-status-in-progress', bgClass: 'status-in-progress' },
  resolved: { icon: CheckCircle2, color: 'text-status-resolved', bgClass: 'status-resolved' },
  closed: { icon: CheckCircle2, color: 'text-status-closed', bgClass: 'status-closed' },
};

export default function EmployeeDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState<Complaint[]>(mockAssignedComplaints);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'employee') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  const handleStatusUpdate = (complaintId: string, newStatus: ComplaintStatus) => {
    setComplaints(prev => prev.map(c =>
      c.id === complaintId
        ? { ...c, status: newStatus, updatedAt: new Date(), ...(newStatus === 'resolved' ? { resolvedAt: new Date() } : {}) }
        : c
    ));
    toast.success(`Status updated to ${STATUS_LABELS[newStatus][language]}`);
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!user || user.role !== 'employee') return null;

  const activeComplaints = complaints.filter(c => c.status === 'in_progress');
  const resolvedComplaints = complaints.filter(c => c.status === 'resolved');

  return (
    <Layout>
      <div className="container-civic py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Welcome, {user.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            You have {activeComplaints.length} assigned tasks
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-in-progress/10 text-status-in-progress">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeComplaints.length}</p>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
              </div>
            </div>
          </div>

          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-resolved/10 text-status-resolved">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{resolvedComplaints.length}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Complaints */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Assigned Tasks</h2>

          {complaints.length === 0 ? (
            <div className="card-civic text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No tasks assigned</h3>
              <p className="text-muted-foreground">You'll see assigned complaints here</p>
            </div>
          ) : (
            complaints.map((complaint) => {
              const StatusIcon = statusConfig[complaint.status].icon;
              const categoryInfo = CATEGORY_LABELS[complaint.category];
              const statusLabel = STATUS_LABELS[complaint.status][language];

              return (
                <div key={complaint.id} className="card-civic-elevated">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl flex-shrink-0">
                        {categoryInfo.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{complaint.title}</h3>
                        <p className="text-sm text-muted-foreground">{categoryInfo[language]}</p>
                      </div>
                    </div>
                    <span className={statusConfig[complaint.status].bgClass}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusLabel}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground mb-4">{complaint.description}</p>

                  {/* Location */}
                  <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-secondary/50">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{complaint.location.area}</p>
                      <p className="text-sm text-muted-foreground">{complaint.location.address}</p>
                    </div>
                    <Button
                      variant="civic"
                      size="sm"
                      onClick={() => openInMaps(complaint.location.latitude, complaint.location.longitude)}
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      Navigate
                    </Button>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {formatDate(complaint.createdAt)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      complaint.priority === 'critical' ? 'bg-destructive/10 text-destructive' :
                      complaint.priority === 'high' ? 'bg-status-pending/10 text-status-pending' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {complaint.priority.toUpperCase()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                    {complaint.status === 'in_progress' && (
                      <>
                        <Select onValueChange={(status: ComplaintStatus) => handleStatusUpdate(complaint.id, status)}>
                          <SelectTrigger className="flex-1 input-civic">
                            <SelectValue placeholder="Update Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="resolved">Mark as Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    {complaint.status === 'resolved' && (
                      <Button variant="civic-accent" className="flex-1 gap-2">
                        <QrCode className="h-4 w-4" />
                        Scan QR to Close
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
