export interface Item {
  id: number;
  title: string;
  category: string;
  author: string;
  year: number;
  image: string;
}

const CATEGORIES = ["Development", "Design", "Data", "Architecture", "Security", "Mobile"];
const AUTHORS = [
  "Dan Abramov", "Lee Robinson", "Kevin Powell", "Matt Perry", "Addy Osmani", 
  "Sarah Drasner", "Kent C. Dodds", "Wes McKinney", "Hadley Wickham", "Edward Tufte",
  "Martin Fowler", "Robert C. Martin", "Alice Goldfuss", "Jessie Frazelle", "Kelsey Hightower"
];

const generateItems = (count: number): Item[] => {
  const items: Item[] = [];
  for (let i = 1; i <= count; i++) {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const author = AUTHORS[Math.floor(Math.random() * AUTHORS.length)];
    const year = 2010 + Math.floor(Math.random() * 15);
    
    items.push({
      id: i,
      title: `${category} Concept #${i}`,
      category: category,
      author: author,
      year: year,
      image: `https://picsum.photos/seed/${i + 100}/300/400`
    });
  }
  return items;
};

// 200 items for high-density and overlap testing
export const ITEMS: Item[] = generateItems(200);
