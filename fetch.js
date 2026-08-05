const fs = require('fs');
const path = require('path');

const DATA_DIR = './data';
const ITEMS_PER_PAGE = 50;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Format raw component slug into a Title Case string
function formatTitle(slug) {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function fetchFromShadcn() {
  try {
    const res = await fetch('https://ui.shadcn.com/registry/index.json', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return [];
    const items = await res.json();
    
    return items.map((item) => {
      const name = item.name || 'component';
      const title = formatTitle(name);
      const category = item.type ? item.type.replace('registry:', '').replace('components:', '') : 'UI';
      
      return {
        id: `shadcn/${name}`,
        title: `${title} Component`,
        prompt: item.description || `Build a reusable ${title} React component with Tailwind CSS and Radix UI primitives.`,
        preview_image: `https://ui.shadcn.com/og?title=${encodeURIComponent(title)}`,
        video_preview: null,
        category: category.toUpperCase()
      };
    });
  } catch (err) {
    console.error('Failed to fetch from shadcn registry:', err.message);
    return [];
  }
}

async function fetchFrom21stSitemap() {
  try {
    const res = await fetch('https://21st.dev/sitemap.xml', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml'
      },
      redirect: 'follow'
    });
    
    if (!res.ok) return [];
    const xmlText = await res.text();
    const matches = [...xmlText.matchAll(/<loc>(https:\/\/21st\.dev\/r\/[^<]+)<\/loc>/g)];

    return matches.map((match) => {
      const url = match[1];
      const pathPart = url.split('/r/')[1] || '';
      const parts = pathPart.split('/');
      const author = parts[0] || 'community';
      const slug = parts[1] || parts[0] || 'component';
      const title = formatTitle(slug);

      return {
        id: `${author}/${slug}`,
        title: title,
        prompt: `Create ${title} UI component inspired by ${author} design on 21st.dev using React and Tailwind CSS.`,
        preview_image: `https://21st.dev/api/og?author=${encodeURIComponent(author)}&slug=${encodeURIComponent(slug)}`,
        video_preview: null,
        category: author
      };
    });
  } catch (err) {
    console.error('Failed to fetch 21st sitemap:', err.message);
    return [];
  }
}

async function run() {
  console.log('Fetching live UI components...');
  
  // Parallel fetching from registries
  const [shadcnItems, dev21stItems] = await Promise.all([
    fetchFromShadcn(),
    fetchFrom21stSitemap()
  ]);

  // Combine and deduplicate
  const combinedMap = new Map();
  [...shadcnItems, ...dev21stItems].forEach(item => {
    if (!combinedMap.has(item.id)) {
      combinedMap.set(item.id, item);
    }
  });

  const allItems = Array.from(combinedMap.values());
  console.log(`Total real components collected: ${allItems.length}`);

  if (allItems.length === 0) {
    console.error('No components fetched from APIs.');
    process.exit(1);
  }

  // Calculate pages
  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);

  // Clear existing page files
  const existingFiles = fs.readdirSync(DATA_DIR);
  existingFiles.forEach(file => {
    if (file.startsWith('page-') && file.endsWith('.json')) {
      fs.unlinkSync(path.join(DATA_DIR, file));
    }
  });

  // Write page files
  for (let page = 1; page <= totalPages; page++) {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = allItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    fs.writeFileSync(
      path.join(DATA_DIR, `page-${page}.json`),
      JSON.stringify(pageItems, null, 2)
    );
  }

  // Write index.json
  const indexData = {
    total_items: allItems.length,
    total_pages: totalPages,
    last_updated: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(DATA_DIR, 'index.json'),
    JSON.stringify(indexData, null, 2)
  );

  console.log(`Successfully generated ${totalPages} pages with ${allItems.length} components.`);
}

run(); 
