import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { Complaint, ComplaintStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Briefcase,
  CheckCircle2,
  MapPin,
  Clock,
  Camera,
  X,
  Upload,
  QrCode,
  AlertTriangle
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolutionImage, setResolutionImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedToken, setScannedToken] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [bypassVerification, setBypassVerification] = useState(false); // For demo purposes in case of no camera or token mismatch issues

  useEffect(() => {
    if (!user || user.role !== 'employee') return;

    // Fetch complaints assigned to this employee
    const q = query(
      collection(db, 'complaints'),
      where('assignedTo', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Complaint[];

      // Sort by status (in_progress first) then date
      data.sort((a, b) => {
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      setComplaints(data);
    });

    return () => unsubscribe();
    return () => unsubscribe();
  }, [user]);

  // Handle Scanner Effect
  useEffect(() => {
    if (isScanning && selectedComplaint) {
      // Small timeout to ensure DOM element exists
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render((decodedText) => {
          // Success
          try {
            const data = JSON.parse(decodedText);
            if (data.id === selectedComplaint.id) {
              setScannedToken(data.token);
              scanner.clear();
              setIsScanning(false);
              verifyToken(data.token);
            } else {
              setVerificationError("QR code does not match this complaint!");
            }
          } catch (e) {
            // Maybe it's just the raw token string?
            if (decodedText === selectedComplaint.verificationToken) {
              setScannedToken(decodedText);
              scanner.clear();
              setIsScanning(false);
              verifyToken(decodedText);
            } else {
              setVerificationError("Invalid QR Code format");
            }
          }
        }, (error) => {
          // Ignore scan errors, they happen every frame
        });

        return () => {
          try { scanner.clear(); } catch (e) { }
        };
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isScanning, selectedComplaint]);

  const verifyToken = (token: string) => {
    if (!selectedComplaint) return;

    if (token === selectedComplaint.verificationToken) {
      toast.success("Verification Successful!");
      setVerificationError('');
    } else {
      setVerificationError("Invalid Token. Verification Failed.");
    }
  };

  const handleManualVerify = () => {
    verifyToken(manualToken.toUpperCase());
  };

  const handleResolveSubmit = async () => {
    if (!selectedComplaint) return;

    // Check verification if not bypassed
    if (!bypassVerification && selectedComplaint.verificationToken && scannedToken !== selectedComplaint.verificationToken && manualToken !== selectedComplaint.verificationToken) {
      toast.error("Please verify via QR Code first");
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real app, upload resolutionImage to storage here
      // For now, we just update the doc

      await updateDoc(doc(db, 'complaints', selectedComplaint.id), {
        status: 'resolved',
        resolvedAt: new Date(),
        adminNote: resolutionNote,
        resolutionImage: resolutionImage
      });

      toast.success("Complaint marked as resolved!");
      setSelectedComplaint(null);
      setResolutionNote('');
      setResolutionImage(null);
      setScannedToken('');
      setManualToken('');
      setVerificationError('');
      setBypassVerification(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to resolve complaint");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (end) => {
        setResolutionImage(end.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user || user.role !== 'employee') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl text-destructive font-bold">Access Denied: Employees Only</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-civic py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Briefcase className="h-8 w-8 text-blue-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Employee Dashboard</h1>
            <p className="text-muted-foreground">My Assigned Tasks</p>
          </div>
        </div>

        <div className="grid gap-6">
          {complaints.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No tasks assigned to you yet.</p>
            </div>
          ) : (
            complaints.map(complaint => (
              <div key={complaint.id} className={`card-civic p-6 border-l-4 ${complaint.status === 'resolved' ? 'border-l-green-500 opacity-75' : 'border-l-blue-500'
                }`}>
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${complaint.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        complaint.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                        {complaint.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(complaint.createdAt, 'PP p')}
                      </span>
                      {complaint.status === 'resolved' && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 uppercase flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Resolved
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold">{complaint.title}</h3>
                    <p className="text-muted-foreground">{complaint.description}</p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 p-2 rounded w-fit">
                      <MapPin className="h-4 w-4" />
                      {complaint.location.address}
                    </div>

                    {complaint.images && complaint.images.length > 0 && (
                      <div className="flex gap-2">
                        {complaint.images.map((img, i) => (
                          <img key={i} src={img} alt="Issue" className="h-20 w-20 object-cover rounded-lg border bg-white" />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between items-end min-w-[200px]">
                    {complaint.status === 'in_progress' ? (
                      <Button
                        className="w-full md:w-auto gap-2"
                        onClick={() => setSelectedComplaint(complaint)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark as Resolved
                      </Button>
                    ) : (
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">Task Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {complaint.resolvedAt ? format(complaint.resolvedAt, 'PP') : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Resolution Dialog */}
        <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Resolve Complaint</DialogTitle>
              <DialogDescription>
                Provide details about the resolution. You can optionally upload an image of the fixed issue.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Verification Section */}
              <div className="p-4 bg-muted/30 rounded-lg border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Identity Verification
                </h3>

                {!scannedToken && !bypassVerification ? (
                  <div className="space-y-3">
                    {isScanning ? (
                      <div className="space-y-2">
                        <div id="reader" className="w-full h-64 bg-black rounded-lg overflow-hidden"></div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setIsScanning(false)}>
                          Stop Scanning
                        </Button>
                      </div>
                    ) : (
                      <Button variant="secondary" className="w-full gap-2" onClick={() => setIsScanning(true)}>
                        <Camera className="h-4 w-4" />
                        Scan Citizen QR Code
                      </Button>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">OR</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Manual Token (e.g. A1B2C3)"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                      <Button variant="outline" onClick={handleManualVerify}>Verify</Button>
                    </div>

                    {verificationError && (
                      <div className="text-destructive text-sm flex items-center gap-1 bg-destructive/10 p-2 rounded">
                        <AlertTriangle className="h-3 w-3" />
                        {verificationError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-green-600 bg-green-50 p-2 rounded border border-green-200 flex items-center gap-2 text-sm justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                    Identity Verified Successfully
                  </div>
                )}

                {/* Verification Bypass (Hidden usually, simplified for now) */}
                {!scannedToken && !bypassVerification && (
                  <div className="mt-2 text-right">
                    <span
                      className="text-[10px] text-muted-foreground underline cursor-pointer hover:text-destructive"
                      onClick={() => {
                        if (confirm("Bypass verification? Only do this if strictly necessary.")) setBypassVerification(true);
                      }}
                    >
                      Emergency Bypass
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution Notes</label>
                <Textarea
                  placeholder="Describe how the issue was fixed..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Proof of Work (Optional)</label>
                <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImageUpload}
                  />
                  {resolutionImage ? (
                    <div className="relative h-40 w-full">
                      <img src={resolutionImage} className="h-full w-full object-contain" />
                      <button
                        onClick={(e) => { e.preventDefault(); setResolutionImage(null); }}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <span className="text-sm">Click to upload photo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedComplaint(null)}>Cancel</Button>
              <Button onClick={handleResolveSubmit} disabled={isSubmitting || !resolutionNote || (!scannedToken && !bypassVerification && !manualToken)}>
                {isSubmitting ? "Submitting..." : "Confirm Resolution"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
