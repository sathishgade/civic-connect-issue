import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Complaint, User, UserRole, ComplaintStatus, CATEGORY_LABELS, STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Shield,
  Users,
  FileText,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Mic,
  MapPin,
  AlertCircle,
  TrendingUp,
  Search,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusConfig: Record<ComplaintStatus, { icon: any; color: string; bgClass: string }> = {
  pending: { icon: Clock, color: 'text-status-pending', bgClass: 'bg-yellow-100 text-yellow-800' },
  in_progress: { icon: AlertCircle, color: 'text-status-in-progress', bgClass: 'bg-blue-100 text-blue-800' },
  resolved: { icon: CheckCircle2, color: 'text-status-resolved', bgClass: 'bg-green-100 text-green-800' },
  closed: { icon: CheckCircle2, color: 'text-status-closed', bgClass: 'bg-gray-100 text-gray-800' },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'complaints' | 'users'>('complaints');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Only Admin
    if (user?.role !== 'admin') return;

    // Fetch Complaints
    const qComplaints = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    const unsubComplaints = onSnapshot(qComplaints, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Complaint[];
      setComplaints(data);
    });

    // Fetch Users
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as User[];
      setUsers(data);
      setLoading(false);
    });

    return () => {
      unsubComplaints();
      unsubUsers();
    };
  }, [user]);

  const handleUpdateStatus = async (complaintId: string, newStatus: ComplaintStatus) => {
    try {
      await updateDoc(doc(db, 'complaints', complaintId), {
        status: newStatus,
        updatedAt: new Date()
      });
      toast.success("Status updated successfully");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleAssign = async (complaintId: string, employeeId: string) => {
    try {
      await updateDoc(doc(db, 'complaints', complaintId), {
        assignedTo: employeeId,
        status: 'in_progress',
        updatedAt: new Date()
      });
      toast.success("Assigned to employee");
    } catch (e) {
      toast.error("Failed to assign");
    }
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    if (!confirm("Are you sure you want to delete this complaint? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'complaints', complaintId));
      toast.success("Complaint deleted");
    } catch (e) {
      toast.error("Failed to delete complaint");
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', targetUserId), { role: newRole });
      toast.success(`User role updated to ${newRole}`);
    } catch (e) {
      toast.error("Failed to update user role");
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const employees = users.filter(u => u.role === 'employee');

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl text-destructive font-bold">Access Denied: Admins Only</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-civic py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage system, users, and complaints</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={activeTab === 'complaints' ? 'default' : 'outline'}
              onClick={() => setActiveTab('complaints')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Complaints
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'outline'}
              onClick={() => setActiveTab('users')}
            >
              <Users className="mr-2 h-4 w-4" />
              User Management
            </Button>
          </div>
        </div>

        {activeTab === 'complaints' && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-civic p-4 text-center">
                <h3 className="text-muted-foreground text-sm font-medium">Total</h3>
                <p className="text-2xl font-bold">{complaints.length}</p>
              </div>
              <div className="card-civic p-4 text-center border-yellow-500/20 bg-yellow-500/5">
                <h3 className="text-yellow-600 text-sm font-medium">Pending</h3>
                <p className="text-2xl font-bold text-yellow-700">
                  {complaints.filter(c => c.status === 'pending').length}
                </p>
              </div>
              <div className="card-civic p-4 text-center border-blue-500/20 bg-blue-500/5">
                <h3 className="text-blue-600 text-sm font-medium">In Progress</h3>
                <p className="text-2xl font-bold text-blue-700">
                  {complaints.filter(c => c.status === 'in_progress').length}
                </p>
              </div>
              <div className="card-civic p-4 text-center border-green-500/20 bg-green-500/5">
                <h3 className="text-green-600 text-sm font-medium">Resolved</h3>
                <p className="text-2xl font-bold text-green-700">
                  {complaints.filter(c => c.status === 'resolved').length}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="card-civic mb-6 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search complaints..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium hidden md:block">Filter Status:</span>
                  <select
                    className="p-2 rounded-lg border bg-background text-sm min-w-[150px]"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="grid gap-4">
              {filteredComplaints.map(complaint => (
                <div key={complaint.id} className="card-civic p-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${complaint.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          complaint.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {complaint.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {complaint.createdAt ? format(complaint.createdAt, 'PP p') : 'Unknown Date'}
                      </span>
                      <span className="text-xs text-muted-foreground bg-secondary px-1 rounded">
                        ID: {complaint.id.slice(0, 6)}
                      </span>
                      {complaint.source === 'voice' && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium border border-purple-200">
                          <Mic className="h-2.5 w-2.5" />
                          Voice
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold">{complaint.title}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">{complaint.description}</p>
                    <div className="text-xs font-mono text-muted-foreground bg-secondary/50 p-1 rounded inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {complaint.location.address}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[200px] w-full lg:w-auto">
                    <div className="text-sm font-semibold mb-1 flex items-center justify-between">
                      <span>Status:</span>
                      <span className={`uppercase px-2 py-0.5 rounded text-xs ml-2 ${statusConfig[complaint.status].bgClass}`}>
                        {complaint.status}
                      </span>
                    </div>

                    {/* Assignee */}
                    {!complaint.assignedTo ? (
                      <Select onValueChange={(val) => handleAssign(complaint.id, val)}>
                        <SelectTrigger className="h-8 text-xs w-full">
                          <SelectValue placeholder="Assign Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-xs text-muted-foreground bg-blue-50 p-1 rounded border border-blue-100">
                        Assigned to: {users.find(u => u.id === complaint.assignedTo)?.name || 'Unknown'}
                      </div>
                    )}

                    <div className="flex gap-2 mt-1">
                      {complaint.status === 'pending' && (
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleUpdateStatus(complaint.id, 'in_progress')}>
                          Mark In Progress
                        </Button>
                      )}
                      {complaint.status === 'in_progress' && (
                        <Button size="sm" variant="default" className="flex-1 h-8 text-xs" onClick={() => handleUpdateStatus(complaint.id, 'resolved')}>
                          Mark Resolved
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" className="h-8 w-8 p-0" title="Delete" onClick={() => handleDeleteComplaint(complaint.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredComplaints.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No complaints found matching filters.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              <strong>Note:</strong> Promoting a user to <strong>Employee</strong> or <strong>Admin</strong> grants them significant access permissions.
            </div>

            <div className="card-civic overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Joined</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'employee' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {u.createdAt ? format(u.createdAt, 'PP') : '-'}
                        </td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          <Select
                            defaultValue={u.role}
                            onValueChange={(val) => handleUpdateRole(u.id, val as UserRole)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="citizen">Citizen</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
