import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ComplaintCategory,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from '@/types';
import {
  Search,
  Filter,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  Calendar,
  User,
  ChevronDown,
} from 'lucide-react';

// Mock data
const mockComplaints: Complaint[] = [
  {
    id: '1',
    userId: '1',
    title: 'Pothole on Main Street',
    description: 'Large pothole causing traffic issues',
    category: 'road',
    status: 'pending',
    priority: 'high',
    location: { latitude: 17.385, longitude: 78.4867, address: 'Main Street, Banjara Hills', area: 'Banjara Hills' },
    images: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
  {
    id: '2',
    userId: '2',
    title: 'Garbage overflow at Market',
    description: 'Garbage not collected for 4 days',
    category: 'garbage',
    status: 'in_progress',
    priority: 'medium',
    location: { latitude: 17.41, longitude: 78.475, address: 'Market Road, Jubilee Hills', area: 'Jubilee Hills' },
    images: [],
    assignedTo: '3',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
  {
    id: '3',
    userId: '3',
    title: 'Broken drainage cover',
    description: 'Dangerous open drainage on footpath',
    category: 'drainage',
    status: 'pending',
    priority: 'critical',
    location: { latitude: 17.42, longitude: 78.46, address: 'Park Road, Madhapur', area: 'Madhapur' },
    images: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
  {
    id: '4',
    userId: '4',
    title: 'Street light not working',
    description: 'Multiple street lights broken in residential area',
    category: 'streetlight',
    status: 'resolved',
    priority: 'low',
    location: { latitude: 17.43, longitude: 78.45, address: 'Colony Road, Gachibowli', area: 'Gachibowli' },
    images: [],
    assignedTo: '3',
    resolvedAt: new Date(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
];

const mockEmployees = [
  { id: '3', name: 'Suresh Babu', area: 'Banjara Hills' },
  { id: '4', name: 'Ramesh Kumar', area: 'Jubilee Hills' },
  { id: '5', name: 'Venkat Rao', area: 'Madhapur' },
];

const statusConfig: Record<ComplaintStatus, { icon: typeof Clock; color: string; bgClass: string }> = {
  pending: { icon: Clock, color: 'text-status-pending', bgClass: 'status-pending' },
  in_progress: { icon: AlertCircle, color: 'text-status-in-progress', bgClass: 'status-in-progress' },
  resolved: { icon: CheckCircle2, color: 'text-status-resolved', bgClass: 'status-resolved' },
  closed: { icon: CheckCircle2, color: 'text-status-closed', bgClass: 'status-closed' },
};

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState<Complaint[]>(mockComplaints);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | 'all'>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.location.area?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || complaint.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleAssign = (complaintId: string, employeeId: string) => {
    setComplaints(prev => prev.map(c => 
      c.id === complaintId 
        ? { ...c, assignedTo: employeeId, status: 'in_progress' as ComplaintStatus }
        : c
    ));
    setSelectedComplaint(null);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <Layout>
      <div className="container-civic py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage and assign civic complaints</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-pending/10 text-status-pending">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>

          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-in-progress/10 text-status-in-progress">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </div>

          <div className="card-civic">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-resolved/10 text-status-resolved">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card-civic mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-civic"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ComplaintStatus | 'all')}>
              <SelectTrigger className="w-full md:w-[180px] input-civic">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ComplaintCategory | 'all')}>
              <SelectTrigger className="w-full md:w-[180px] input-civic">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CATEGORY_LABELS[key].icon} {CATEGORY_LABELS[key][language]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="card-civic overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Issue</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Category</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Location</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Date</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((complaint) => {
                  const StatusIcon = statusConfig[complaint.status].icon;
                  const categoryInfo = CATEGORY_LABELS[complaint.category];
                  const statusLabel = STATUS_LABELS[complaint.status][language];

                  return (
                    <tr key={complaint.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-foreground">{complaint.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{complaint.description}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="flex items-center gap-2">
                          <span>{categoryInfo.icon}</span>
                          <span className="text-sm">{categoryInfo[language]}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {complaint.location.area}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={statusConfig[complaint.status].bgClass}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(complaint.createdAt)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {!complaint.assignedTo ? (
                          <Select onValueChange={(employeeId) => handleAssign(complaint.id, employeeId)}>
                            <SelectTrigger className="w-[140px] h-9">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {mockEmployees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            Assigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredComplaints.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No complaints found</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
