"use client";

import { marketingSite } from "@/lib/config/marketing";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, Mail, Send } from "lucide-react";

export default function ContactPage() {
  return (
    <section className="relative w-full bg-gradient-to-b from-background via-background to-muted/25 py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-24 -left-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Hero */}
        <header className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            Get in touch
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Contact{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              S R School of Excellence
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Have questions about admissions, transport, or school activities? Reach out
            using the details below or drop us a message and we&apos;ll respond shortly.
          </p>
        </header>

        {/* Contact content */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
          {/* Left: contact info */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/70 bg-card/90 p-5 sm:p-6 shadow-sm backdrop-blur space-y-4">
              {/* Address */}
              <div className="flex gap-3 rounded-xl border border-border/60 bg-background/70 p-4">
                <div className="mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Campus address
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    S R School of Excellence
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {marketingSite.address.full}
                  </p>
                </div>
              </div>

              {/* Phone + email */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/70 p-4">
                  <div className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Phone numbers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {marketingSite.contactPhones.map((phone) => (
                        <a
                          key={phone}
                          href={`tel:${phone}`}
                          className="inline-flex items-center rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          {phone}
                        </a>
                      ))}
                    </div>
                    {marketingSite.landline ? (
                      <p className="text-xs text-muted-foreground">
                        Landline: {marketingSite.landline}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/70 p-4">
                  <div className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Email
                    </p>
                    <a
                      href={`mailto:${marketingSite.contactEmail}`}
                      className="break-all text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {marketingSite.contactEmail}
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right: form */}
          <div className="rounded-2xl border border-border/70 bg-card/95 shadow-md backdrop-blur-sm p-6 sm:p-8">
            <div className="mb-6 space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                Send us a message
              </h2>
              <p className="text-sm text-muted-foreground">
                Fill out the form below and our team will get back to you as soon as
                possible.
              </p>
            </div>
            <form className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="Enter your full name"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 1234567890"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  placeholder="Tell us how we can help you..."
                  className="resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="hidden text-xs text-muted-foreground sm:block">
                  By submitting, you agree to be contacted on the provided details.
                </p>
                <Button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 h-11 text-sm font-semibold"
                >
                  <Send className="size-4" />
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Map section */}
        <section className="mt-6 rounded-2xl border border-border/70 bg-card/90 shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Visit our campus
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Acharya Nagar, Near Omkareshwar Temple, Banta Square (Opposite to RWSS /
                PWD Office), Bhadrak-756100
              </p>
            </div>
          </div>
          <AspectRatio ratio={16 / 9} className="relative">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3723.324246633259!2d86.489845!3d21.059708!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a1c09fd3982917f%3A0xf57bcb506fc1f014!2sSR%20School%20Of%20Excllence!5e0!3m2!1sen!2sus!4v1764395959024!5m2!1sen!2sus"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full w-full border-0"
            />
          </AspectRatio>
        </section>
      </div>
    </section>
  );
}


