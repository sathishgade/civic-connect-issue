import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_LABELS, ComplaintCategory } from '@/types';
import { toast } from 'sonner';
import {
  MapPin,
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Navigation
} from 'lucide-react';

export default function NewComplaint() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as ComplaintCategory | '',
  });
  
  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
    address: '',
  });
  
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Try to get address from coordinates (using a mock for demo)
        const address = `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
        
        setLocation({
          latitude,
          longitude,
          address,
        });
        
        toast.success('Location captured successfully!');
        setIsGettingLocation(false);
      },
      (error) => {
        toast.error('Unable to get your location. Please enter manually.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    if (!location.latitude && !location.address) {
      toast.error('Please provide location');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Complaint submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to submit complaint. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="container-civic py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {t('nav.newComplaint')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details below to report a civic issue
          </p>
        </div>

        {/* Form */}
        <div className="card-civic">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('complaint.category')} *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: ComplaintCategory) => 
                  setFormData(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger className="input-civic">
                  <SelectValue placeholder="Select issue category" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{CATEGORY_LABELS[key].icon}</span>
                        <span>{CATEGORY_LABELS[key][language]}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t('complaint.title')} *</Label>
              <Input
                id="title"
                placeholder="Brief title of the issue"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input-civic"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('complaint.description')} *</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input-civic min-h-[120px]"
                required
              />
            </div>

            {/* Location */}
            <div className="space-y-3">
              <Label>{t('complaint.location')} *</Label>
              
              <Button
                type="button"
                variant="civic-outline"
                className="w-full justify-center gap-2"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Getting location...
                  </>
                ) : location.latitude ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    Location captured
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4" />
                    Get Current Location
                  </>
                )}
              </Button>

              {location.latitude !== 0 && (
                <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Location captured</p>
                      <p className="text-muted-foreground">{location.address}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-3 text-muted-foreground">or enter manually</span>
                </div>
              </div>

              <Input
                placeholder="Enter address manually"
                value={location.address}
                onChange={(e) => setLocation(prev => ({ ...prev, address: e.target.value }))}
                className="input-civic"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <Label>{t('complaint.uploadImage')}</Label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6" />
                  <span>Upload Photo</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-24 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                      fileInputRef.current.removeAttribute('capture');
                    }
                  }}
                >
                  <Camera className="h-6 w-6" />
                  <span>Take Photo</span>
                </Button>
              </div>

              {/* Image Preview */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="civic"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                t('complaint.submit')
              )}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
