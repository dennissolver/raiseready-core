// components/Footer.tsx
'use client';

import Link from 'next/link';
import { clientConfig } from '@/config';

export function Footer() {
  const { company, footer, offices, theme } = clientConfig;
  const currentYear = new Date().getFullYear();
  const primaryOffice = offices.find(o => o.isPrimary) || offices[0];

  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">{company.name}</h3>
            <p className="text-sm mb-4">{footer.description || company.tagline}</p>
            {primaryOffice && (
              <p className="text-sm">
                {company.legalName}<br />
                {primaryOffice.address}<br />
                {primaryOffice.city}, {primaryOffice.country}
              </p>
            )}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Services</h3>
            <ul className="space-y-2 text-sm">
              {footer.serviceLinks.map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  {company.name} Services
                </a>
              </li>
              <li>
                <a href={company.social.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              {footer.companyLinks.map((link, i) => (
                <li key={i}>
                  <Link href={link.href} className="hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contact</h3>
            <div className="space-y-2 text-sm">
              <a href={'mailto:' + company.supportEmail} className="hover:text-white transition-colors block">
                {company.supportEmail}
              </a>
              {primaryOffice?.phone && (
                <a href={'tel:' + primaryOffice.phone} className="hover:text-white transition-colors block">
                  {primaryOffice.phone}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>© {currentYear} {company.legalName}. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            {footer.legalLinks.map((link, i) => (
              <Link key={i} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
            <a href={'mailto:' + company.supportEmail} className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
