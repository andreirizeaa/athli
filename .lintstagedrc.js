module.exports = {
  'apps/www/**/*.{js,jsx,ts,tsx,json}': (filenames) => {
    const relativeFiles = filenames.map((f) => f.replace('apps/www/', ''));
    return `cd apps/www && npx biome format --write ${relativeFiles.join(' ')}`;
  },
  'apps/app/**/*.{js,jsx,ts,tsx,json}': (filenames) => {
    const relativeFiles = filenames.map((f) => f.replace('apps/app/', ''));
    return `cd apps/app && npx biome format --write ${relativeFiles.join(' ')}`;
  },
};

