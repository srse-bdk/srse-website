import type { BentoGalleryItem } from "@/components/home/bento-gallery";

export type GalleryVideo = {
  id: number | string;
  title: string;
  youtubeId: string;
  description?: string;
};

export const galleryItems: BentoGalleryItem[] = [
  {
    id: 1,
    title: "Smart Classrooms",
    desc: "Modern, air-conditioned learning spaces",
    url: "/photos/classroom.jpg",
    span: "md:min-w-[25rem]",
  },
  {
    id: 2,
    title: "Fun Time",
    desc: "Joyful moments of shared happiness",
    url: "/photos/fun-time.jpg",
    span: "md:min-w-[22rem]",
  },
  {
    id: 3,
    title: "Morning Activity",
    desc: "Starting the day with energy and focus",
    url: "/photos/morning-activity.jpg",
    span: "md:min-w-[20rem]",
  },
  {
    id: 4,
    title: "Flag Hoisting",
    desc: "Celebrating national pride and values",
    url: "/photos/flaghosting.jpeg",
    span: "md:min-w-[24rem]",
  },
  {
    id: 5,
    title: "Activity Room",
    desc: "Space for creativity and hands-on learning",
    url: "/photos/activity-room.jpg",
    span: "md:min-w-[18rem]",
  },
  {
    id: 6,
    title: "Picnic Time",
    desc: "Exploring nature and bonding outdoors",
    url: "/photos/picnictme.jpeg",
    span: "md:min-w-[22rem]",
  },
  {
    id: 7,
    title: "Play Time",
    desc: "Physical activities in our spacious play area",
    url: "/photos/play-time.jpg",
    span: "md:min-w-[20rem]",
  },
  {
    id: 8,
    title: "Campus Entrance",
    desc: "Welcoming students to a world of learning",
    url: "/photos/entrance.jpg",
    span: "md:min-w-[23rem]",
  },
];

export const galleryVideos: GalleryVideo[] = [
  {
    id: 1,
    title: "Lungi Dance by SRSE Pre-KG Students",
    youtubeId: "RjiYFaO0TBY",
    description: "Adorable performance by our Pre-KG students at the annual function.",
  },
  {
    id: 2,
    title: "Dance by Abacus Students @ SRSE Annual Function",
    youtubeId: "UUmBjyu6CwE",
    description: "Energetic dance performance from our Abacus students.",
  },
  {
    id: 3,
    title: "Chanda Chamke @ SRSE Annual Function",
    youtubeId: "KlEc2LEuy9M",
    description: "Chanda Chamke performance capturing the joy of our learners.",
  },
  {
    id: 4,
    title: "Sanam Re @ SRSE Annual Function",
    youtubeId: "HcKGQtGYSrw",
    description: "A soulful rendition of Sanam Re at the annual function.",
  },
  {
    id: 5,
    title: "S R School Of Excellence in a Nutshell",
    youtubeId: "9i02YAzxrXg",
    description: "A quick overview of S R School of Excellence and its vibrant campus.",
  },
];

export const galleryConfig = {
  title: "Our World-Class Facilities & Moments",
  description:
    "Explore the modern facilities, vibrant campus life, and memorable events that make S R School of Excellence a premier educational institution.",
};
