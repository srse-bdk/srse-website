export type FaqCategory = "general" | "pricing" | "technical" | "support";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
}

export interface FaqConfig {
  title: string;
  description: string;
  contactText?: string;
  contactLink?: string;
}

export const faqItems: FaqItem[] = [
  {
    id: "1",
    question: "What is S R School of Excellence?",
    answer:
      "S R School of Excellence is a premier educational institution owned and managed by Ram Narayan Ray Educational Charitable Trust, founded in January 2016. We are dedicated to providing quality education with modern facilities and a nurturing environment.",
    category: "general",
  },
  {
    id: "2",
    question: "Who founded the school?",
    answer:
      "S R School of Excellence was founded in January 2016 by the Ram Narayan Ray Educational Charitable Trust, in memory of Late Ram Narayan Ray. The school is committed to continuing his vision of excellence in education.",
    category: "general",
  },
  {
    id: "3",
    question: "What facilities does the school offer?",
    answer:
      "Our school offers a quiet residential layout, complete CCTV surveillance, compassionate and caring staff, colourful premises with theme-based furniture, well-equipped spacious play area, alternate power supply, air-conditioned smart classes, variety of indoor activities, pick and drop facility, and encourages parental involvement.",
    category: "general",
  },
  {
    id: "4",
    question: "What are the school timings?",
    answer:
      "Please contact us directly at 9438465475 or 9437530949, or email us at srschoolofexcellence@gmail.com for detailed information about school timings and academic schedule.",
    category: "general",
  },
  {
    id: "5",
    question: "Do you provide transportation facilities?",
    answer:
      "Yes, we offer pick and drop facility for the convenience of our students. Please contact the school administration for more details about routes and availability.",
    category: "general",
  },
  {
    id: "6",
    question: "What is the admission process?",
    answer:
      "For admission inquiries, please visit our school at Acharya Nagar, Near Omkareshwar Temple, Banta Square (Opposite to RWSS / PWD Office), Bhadrak-756100, or contact us via phone or email. Our staff will guide you through the admission process.",
    category: "general",
  },
  {
    id: "7",
    question: "How can I contact the school?",
    answer:
      "You can reach us at: Mobile - 9438465475, 9437530949; Landline - 06784-241271; Email - srschoolofexcellence@gmail.com. Our address is Acharya Nagar, Near Omkareshwar Temple, Banta Square (Opposite to RWSS / PWD Office), Bhadrak-756100.",
    category: "support",
  },
  {
    id: "8",
    question: "What safety measures are in place?",
    answer:
      "The entire school area is under CCTV surveillance, ensuring a safe and secure environment for all students. We also have compassionate and caring staff who prioritize student safety and well-being.",
    category: "general",
  },
  {
    id: "9",
    question: "Do you have smart classrooms?",
    answer:
      "Yes, we have air-conditioned smart classes equipped with modern technology to enhance the learning experience and provide students with an interactive educational environment.",
    category: "general",
  },
  {
    id: "10",
    question: "How can parents get involved?",
    answer:
      "We strongly encourage parental involvement in the school. Parents can participate in various school activities, parent-teacher meetings, and school events. Please contact the school administration to learn more about opportunities for parental engagement.",
    category: "general",
  },
];

export const faqConfig: FaqConfig = {
  title: "Frequently Asked Questions",
  description:
    "Find answers to common questions about S R School of Excellence, admissions, facilities, and more.",
  contactText: "Still have questions?",
  contactLink: "#contact",
};

