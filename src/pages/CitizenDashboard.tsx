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
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  ChevronRight,
  TrendingUp,
  Mic,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

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

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalComplaints: 0,
    pendingComplaints: 0,
    inProgressComplaints: 0,
    resolvedComplaints: 0,
    avgResolutionTime: 0,
  });
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!user) return;

    const q = query(
      collection(db, 'complaints'),
      where('userId', '==', user.id)
      // orderBy('createdAt', 'desc') // Requires index for compound query with where
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComplaints = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate(),
        } as Complaint;
      });

      // Sort manually until index is created
      fetchedComplaints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setComplaints(fetchedComplaints);

      // Calculate stats
      const newStats = {
        totalComplaints: fetchedComplaints.length,
        pendingComplaints: fetchedComplaints.filter(c => c.status === 'pending').length,
        inProgressComplaints: fetchedComplaints.filter(c => c.status === 'in_progress').length,
        resolvedComplaints: fetchedComplaints.filter(c => c.status === 'resolved' || c.status === 'closed').length,
        avgResolutionTime: 0, // Placeholder calculation
      };
      setStats(newStats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, navigate, user]);

  if (!user) return null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm("Are you sure you want to delete this complaint?")) return;
    try {
      await deleteDoc(doc(db, 'complaints', id));
      toast.success("Complaint deleted successfully");
    } catch (e) {
      toast.error("Failed to delete complaint");
    }
  };

  const handleEditClick = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setEditForm({ title: complaint.title, description: complaint.description });
  };

  const handleEditSubmit = async () => {
    if (!editingComplaint) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'complaints', editingComplaint.id), {
        title: editForm.title,
        description: editForm.description,
        updatedAt: new Date()
      });
      toast.success("Complaint updated");
      setEditingComplaint(null);
    } catch (e) {
      toast.error("Failed to update complaint");
    } finally {
      setIsUpdating(false);
    }
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
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors group relative"
                  >
                    {/* Category Icon */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl flex-shrink-0 cursor-pointer" onClick={() => navigate(`/complaint/${complaint.id}`)}>
                      {categoryInfo.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/complaint/${complaint.id}`)}>
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
                        {complaint.source === 'voice' && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <Mic className="h-3 w-3" />
                            Voice Report
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions for Pending Complaints */}
                    {complaint.status === 'pending' && (
                      <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(complaint);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(complaint.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors hidden md:block" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingComplaint} onOpenChange={(open) => !open && setEditingComplaint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Complaint</DialogTitle>
            <DialogDescription>Update the details of your complaint.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingComplaint(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
