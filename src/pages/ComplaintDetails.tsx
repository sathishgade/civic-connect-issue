import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Complaint, CATEGORY_LABELS, STATUS_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import {
    ArrowLeft,
    Clock,
    AlertCircle,
    CheckCircle2,
    MapPin,
    Calendar,
    Mic,
    QrCode
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-200' },
    in_progress: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
    resolved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
    closed: { icon: CheckCircle2, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' },
};

export default function ComplaintDetails() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const { language } = useLanguage();
    const navigate = useNavigate();
    const [complaint, setComplaint] = useState<Complaint | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const unsubscribe = onSnapshot(doc(db, 'complaints', id), (doc) => {
            if (doc.exists()) {
                setComplaint({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate(),
                    resolvedAt: doc.data().resolvedAt?.toDate(),
                } as Complaint);
            } else {
                toast.error("Complaint not found");
                navigate('/dashboard');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id, navigate]);

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            </Layout>
        );
    }

    if (!complaint) return null;

    const StatusIcon = statusConfig[complaint.status].icon;
    const categoryInfo = CATEGORY_LABELS[complaint.category];

    // QR Code Data: JSON string with id and verificationToken
    const qrData = JSON.stringify({
        id: complaint.id,
        token: complaint.verificationToken || ''
    });

    return (
        <Layout>
            <div className="container-civic py-8 max-w-4xl">
                <Button
                    variant="ghost"
                    className="mb-6 pl-0 gap-2 hover:bg-transparent"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="card-civic p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig[complaint.status].bg} ${statusConfig[complaint.status].color} ${statusConfig[complaint.status].border}`}>
                                    <StatusIcon className="h-4 w-4" />
                                    <span className="uppercase">{STATUS_LABELS[complaint.status][language]}</span>
                                </div>
                                <span className="text-sm text-muted-foreground font-mono">
                                    ID: {complaint.id.slice(0, 8)}
                                </span>
                            </div>

                            <h1 className="text-2xl font-bold mb-2">{complaint.title}</h1>
                            <p className="text-muted-foreground mb-6 whitespace-pre-wrap">
                                {complaint.description}
                            </p>

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{categoryInfo.icon}</span>
                                    <span>{categoryInfo[language]}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{complaint.location.address}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(complaint.createdAt, 'PP p')}</span>
                                </div>
                                {complaint.source === 'voice' && (
                                    <div className="flex items-center gap-2 text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                        <Mic className="h-3 w-3" />
                                        <span>Voice Report</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {complaint.images && complaint.images.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Attached Photos</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {complaint.images.map((img, i) => (
                                        <img key={i} src={img} alt={`Evidence ${i + 1}`} className="rounded-xl border w-full h-48 object-cover" />
                                    ))}
                                </div>
                            </div>
                        )}

                        {complaint.status === 'resolved' && complaint.resolvedAt && (
                            <div className="card-civic p-6 bg-green-50 border-green-200">
                                <h3 className="font-bold text-green-800 flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Resolution Details
                                </h3>
                                <p className="text-green-900 mb-4">{complaint.adminNote || "Issue resolved by employee."}</p>
                                {complaint.resolutionImage && (
                                    <div className="rounded-xl overflow-hidden border border-green-200 max-w-sm">
                                        <img src={complaint.resolutionImage} alt="Proof of work" className="w-full" />
                                    </div>
                                )}
                                <p className="text-xs text-green-700 mt-4">
                                    Resolved on: {format(complaint.resolvedAt, 'PP p')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / QR Code */}
                    <div className="space-y-6">
                        {/* Only show QR code if not resolved yet */}
                        {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
                            <div className="card-civic p-6 flex flex-col items-center text-center bg-white shadow-xl border-dashed border-2 border-primary/20">
                                <div className="bg-primary/10 p-3 rounded-full mb-4">
                                    <QrCode className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Verification Code</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Show this QR code to the civic employee when they arrive to resolve the issue.
                                </p>

                                <div className="bg-white p-4 rounded-xl shadow-inner border">
                                    <QRCodeSVG
                                        value={qrData}
                                        size={200}
                                        level="H"
                                        includeMargin
                                    />
                                </div>
                                <p className="mt-4 font-mono text-xs text-muted-foreground tracking-widest">
                                    TOKEN: {complaint.verificationToken || 'N/A'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
