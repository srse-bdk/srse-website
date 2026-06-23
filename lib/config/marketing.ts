export const marketingSite = {
  name: "S R School of Excellence",
  title: "S R School of Excellence",
  description:
    "S R School of Excellence - A premier educational institution owned and managed by Ram Narayan Ray Educational Charitable Trust, providing quality education with modern facilities and compassionate care.",
  tagline:
    "Excellence in Education, Nurturing Tomorrow's Leaders - Founded in January 2016",
  url: "https://www.srse.rnray.in",
  domain: "www.srse.rnray.in",
  contactEmail: "srschoolofexcellence@gmail.com",
  contactPhone: "9438465475",
  contactPhones: ["9438465475", "9437530949"],
  landline: "06784-241271",
  address: {
    street: "Acharya Nagar, Near Omkareshwar Temple",
    landmark: "Banta Square (Opposite to RWSS / PWD Office)",
    city: "Bhadrak",
    pincode: "756100",
    full: "Acharya Nagar, Near Omkareshwar Temple, Banta Square (Opposite to RWSS / PWD Office), Bhadrak-756100",
  },
  founder: {
    name: "Late Ram Narayan Ray",
    trust: "Ram Narayan Ray Educational Charitable Trust",
    founded: "January 2016",
  },
  facilities: [
    "Quiet and Residential Layout",
    "Complete Area under CC TV Surveillance",
    "Compassionate and Caring Staffs",
    "Colourful Premises with Theme based Furniture",
    "Well Equipped and Spacious Play Area",
    "Alternate Power Supply",
    "Air Conditioned Smart Class",
    "Variety of Indoor Activities",
    "Pick and Drop Facility",
    "Parental Involvement in the School",
  ],
  social: {
    twitter: "",
    github: "",
    linkedin: "",
    youtube: "https://www.youtube.com/@srschoolofexcellence",
    facebook: "https://www.facebook.com/profile.php?id=61573174480321",
    instagram: "https://www.instagram.com/srschool_bdk/",
  },
  quickLinks: [
    {
      label: "Read the latest blog posts",
      href: "/blogs",
    },
    {
      label: "Contact Us",
      href: "#contact",
    },
    {
      label: "Privacy Policy",
      href: "/privacy",
    },
  ],
  megaMenu: [
    {
      label: "Resources",
      href: "#resources",
      items: [
        {
          label: "Fee Structure",
          href: "/fee-structure",
          icon: "Database",
          description: "Check our transparent fee structure and payment plans",
          featured: true,
        },
        {
          label: "Circular",
          href: "/circular",
          icon: "FileCode",
          description: "View important circulars and announcements",
          featured: true,
        },
        {
          label: "Blogs",
          href: "/blogs",
          icon: "BookOpen",
          description:
            "Read our latest news, updates, and educational articles",
          featured: true,
        },
        {
          label: "Privacy Policy",
          href: "/privacy",
          icon: "Settings",
          description: "Read our privacy policy and data protection practices",
          featured: false,
        },
      ],
    },
  ],
} as const;

export type MarketingSite = typeof marketingSite;
