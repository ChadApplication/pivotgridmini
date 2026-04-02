export interface Item {
  id: number;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  year: number;
  image: string;
  email?: string;
  url?: string;
}

const CATEGORIES = ["Development", "Design", "Data", "Architecture", "Security", "Mobile", "Cloud"];

const TAGS: Record<string, string[]> = {
  Development: ["React", "TypeScript", "Node.js", "API", "Testing"],
  Design: ["UI/UX", "Figma", "Typography", "Color", "Motion"],
  Data: ["Python", "R", "SQL", "Visualization", "ML"],
  Architecture: ["Microservices", "Serverless", "Monolith", "Event-Driven", "DDD"],
  Security: ["Auth", "Encryption", "OWASP", "Firewall", "Pentest"],
  Mobile: ["iOS", "Android", "Flutter", "React Native", "PWA"],
  Cloud: ["AWS", "GCP", "Azure", "Docker", "Kubernetes"],
};

const AUTHORS = [
  "Dan Abramov", "Lee Robinson", "Kevin Powell", "Matt Perry", "Addy Osmani",
  "Sarah Drasner", "Kent C. Dodds", "Wes McKinney", "Hadley Wickham", "Edward Tufte",
  "Martin Fowler", "Robert C. Martin", "Alice Goldfuss", "Jessie Frazelle", "Kelsey Hightower"
];

const DESCRIPTIONS = [
  "A comprehensive guide to modern best practices and design patterns.",
  "Exploring innovative approaches to solve real-world challenges.",
  "Deep dive into performance optimization and scalable solutions.",
  "Practical techniques for building production-ready systems.",
  "Research-driven analysis with actionable insights.",
  "Step-by-step tutorial covering fundamentals to advanced topics.",
  "Case study demonstrating measurable impact and outcomes.",
];

// Simple seeded PRNG for deterministic data
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const generateItems = (count: number): Item[] => {
  const rand = mulberry32(42); // fixed seed for reproducibility
  const items: Item[] = [];

  for (let i = 1; i <= count; i++) {
    const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
    const author = AUTHORS[Math.floor(rand() * AUTHORS.length)];
    const year = 2010 + Math.floor(rand() * 15);
    const categoryTags = TAGS[category] || [];
    const tagCount = 1 + Math.floor(rand() * 3);
    const tags: string[] = [];
    for (let t = 0; t < tagCount; t++) {
      const tag = categoryTags[Math.floor(rand() * categoryTags.length)];
      if (!tags.includes(tag)) tags.push(tag);
    }
    const description = DESCRIPTIONS[Math.floor(rand() * DESCRIPTIONS.length)];

    const authorSlug = author.toLowerCase().replace(/\s+/g, ".");
    items.push({
      id: i,
      title: `${category} Concept #${i}`,
      description,
      category,
      tags,
      author,
      year,
      image: `https://picsum.photos/seed/${i + 100}/300/400`,
      email: `${authorSlug}@example.com`,
      url: `https://example.com/${category.toLowerCase()}/${i}`,
    });
  }
  return items;
};

// 200 items for high-density and overlap testing
export const ITEMS: Item[] = generateItems(200);
