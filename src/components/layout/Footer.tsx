import { Building2, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container-civic py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">CivicConnect</h3>
                <p className="text-sm text-primary-foreground/70">Smart Issue Reporting</p>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/70 max-w-md">
              An AI-powered platform for citizens to report civic issues and track their resolution. 
              Making cities cleaner, safer, and more responsive.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/" className="hover:text-primary-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-primary-foreground transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-primary-foreground transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <Link to="/complaint/new" className="hover:text-primary-foreground transition-colors">
                  Report Issue
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+91 1800-XXX-XXXX</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>support@civicconnect.gov.in</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>Municipal Corporation Office, City Center</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-primary-foreground/60">
            <p>© 2024 CivicConnect. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="#" className="hover:text-primary-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="#" className="hover:text-primary-foreground transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
