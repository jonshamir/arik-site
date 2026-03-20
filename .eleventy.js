const { categories, toSlug } = require('./_data/categories.js');

module.exports = function (eleventyConfig) {
  // Add toSlug filter for Nunjucks
  eleventyConfig.addFilter('toSlug', toSlug);

  // Collection: papers grouped by category
  eleventyConfig.addCollection('papersByCategory', function (collectionApi) {
    const allPapers = require('./_data/papers.js')();
    return categories.map(name => ({
      name,
      slug: toSlug(name),
      papers: allPapers.filter(p => p.categories && p.categories.includes(name))
    }));
  });

  // Ignore non-template files
  eleventyConfig.ignores.add('README.md');
  eleventyConfig.ignores.add('CLAUDE.md');

  // Passthrough copy
  eleventyConfig.addPassthroughCopy('images');
  eleventyConfig.addPassthroughCopy('papers');

  return {
    dir: {
      input: '.',
      output: '_site'
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
};
