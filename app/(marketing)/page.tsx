import { Hero } from "@/components/home/hero";
import { PrincipalMessage } from "@/components/home/principal-message";
import { MissionVision } from "@/components/home/mission-vision";
import { TestimonialsMarquee } from "@/components/home/testimonials-marquee";
import { BentoGallery } from "@/components/home/bento-gallery";
import { Faq } from "@/components/home/faq";
import { ContactForm } from "@/components/home/contact-form";
import { testimonials } from "@/lib/config/testimonials";
import { galleryItems, galleryConfig } from "@/lib/config/gallery";
import { faqItems, faqConfig } from "@/lib/config/faq";

export default function MarketingHome() {
  return (
    <>
      <Hero />
      <MissionVision />
      <PrincipalMessage />
      <BentoGallery
        imageItems={galleryItems}
        title={galleryConfig.title}
        description={galleryConfig.description}
      />
      <TestimonialsMarquee testimonials={testimonials} />
      <Faq faqItems={faqItems} config={faqConfig} />
      <ContactForm />
    </>
  );
}
