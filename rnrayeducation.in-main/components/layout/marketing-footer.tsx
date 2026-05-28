"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { marketingSite } from "@/lib/config/marketing";
import { motion } from "motion/react";
import {
  Twitter,
  Linkedin,
  Youtube,
  Facebook,
  Instagram,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ArrowUp,
} from "lucide-react";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-[#6B2C3E] text-white">
      <motion.div
        className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Organization Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">
              {marketingSite.name}
            </h3>
            <p className="text-sm text-white/90 leading-relaxed">
              Owned and managed by {marketingSite.founder.trust}, providing
              quality education with modern facilities and compassionate care.
            </p>
            <div className="pt-2 border-l-4 border-red-600 pl-3">
              <p className="text-sm text-red-400 font-medium">
                Excellence in Education, Nurturing Tomorrow&apos;s Leaders
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white border-b-2 border-red-600 pb-2 inline-block">
              Quick Links
            </h3>
            <div className="flex flex-col gap-2">
              {marketingSite.quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/90 hover:text-white transition-colors inline-flex items-center gap-2 group"
                >
                  <ChevronRight className="size-4 text-red-500 group-hover:translate-x-1 transition-transform" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Us */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white border-b-2 border-red-600 pb-2 inline-block">
              Contact Us
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Phone className="size-4 mt-1 flex-shrink-0 text-white" />
                <div className="flex flex-col gap-1">
                  {marketingSite.contactPhones.map((phone, idx) => (
                    <a
                      key={idx}
                      href={`tel:${phone}`}
                      className="text-sm text-white/90 hover:text-white transition-colors"
                    >
                      {phone}
                    </a>
                  ))}
                  {marketingSite.landline && (
                    <span className="text-sm text-white/90">
                      {marketingSite.landline}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`mailto:${marketingSite.contactEmail}`}
                className="flex items-center gap-2 text-sm text-white/90 hover:text-white transition-colors"
              >
                <Mail className="size-4 flex-shrink-0" />
                {marketingSite.contactEmail}
              </Link>
              <div className="flex items-start gap-2">
                <MapPin className="size-4 mt-1 flex-shrink-0 text-white" />
                <p className="text-sm text-white/90 leading-relaxed">
                  {marketingSite.address.full}
                </p>
              </div>
            </div>
          </div>

          {/* Follow Us */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white border-b-2 border-red-600 pb-2 inline-block">
              Follow Us
            </h3>
            <p className="text-sm text-white/90">
              Stay connected with us on social media for updates and news.
            </p>
            <div className="flex items-center gap-3">
              {marketingSite.social.facebook && (
                <Link
                  href={marketingSite.social.facebook}
                  className="size-10 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="size-5 text-white" />
                </Link>
              )}
              {marketingSite.social.instagram && (
                <Link
                  href={marketingSite.social.instagram}
                  className="size-10 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="size-5 text-white" />
                </Link>
              )}
              {marketingSite.social.twitter && (
                <Link
                  href={marketingSite.social.twitter}
                  className="size-10 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="size-5 text-white" />
                </Link>
              )}
              {marketingSite.social.youtube && (
                <Link
                  href={marketingSite.social.youtube}
                  className="size-10 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="size-5 text-white" />
                </Link>
              )}
              {marketingSite.social.linkedin && (
                <Link
                  href={marketingSite.social.linkedin}
                  className="size-10 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="size-5 text-white" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/80">
            © {year} {marketingSite.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-white/80">
            <span>Designed & Developed by</span>
            <Link
              href="https://www.techwebster.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Image
                src="https://www.techwebster.com/icon.svg"
                alt="TechWebster"
                width={20}
                height={20}
                className="size-5"
              />
              <span className="font-semibold">TechWebster</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          onClick={scrollToTop}
          className="fixed right-8 bottom-24 z-50 size-12 rounded-full bg-black hover:bg-black/80 flex items-center justify-center shadow-lg transition-colors"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          aria-label="Scroll to top"
        >
          <ArrowUp className="size-5 text-white" />
        </motion.button>
      )}
    </footer>
  );
}
