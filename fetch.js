const fs = require('fs');
const path = require('path');

const DATA_DIR = './data';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function fetchDribbbleData() {
  const token = process.env.DRIBBBLE_TOKEN;
  
  if (!token) {
    console.error('Error: DRIBBBLE_TOKEN secret is missing!');
    process.exit(1);
  }

  try {
    console.log('Fetching data from Dribbble API...');
    const res = await fetch('https://api.dribbble.com/v2/user/shots', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`API error! status: ${res.status}`);
    }

    const shots = await res.json();
    console.log(`Successfully fetched ${shots.length} shots.`);

    // Save page-1.json
    fs.writeFileSync(
      path.join(DATA_DIR, 'page-1.json'),
      JSON.stringify(shots, null, 2)
    );

    // Save index.json
    const indexData = {
      total_items: shots.length,
      total_pages: 1,
      last_updated: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(DATA_DIR, 'index.json'),
      JSON.stringify(indexData, null, 2)
    );

    console.log('Data saved successfully in data/ folder.');
  } catch (err) {
    console.error('Failed to fetch Dribbble data:', err.message);
    process.exit(1);
  }
}

fetchDribbbleData(); 
