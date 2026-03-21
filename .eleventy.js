const { categories, toSlug } = require('./_data/categories.js');

module.exports = function (eleventyConfig) {
  // Add toSlug filter for Nunjucks
  eleventyConfig.addFilter('toSlug', toSlug);

  // Add toBibtex filter
  eleventyConfig.addFilter('toBibtex', function (paper) {
    const lastNameMatch = paper.authors[0].split(' ').pop().toLowerCase();
    const key = lastNameMatch + paper.year;
    const isJournal = paper.paperType === 'journal';
    const entryType = isJournal ? 'article' : 'inproceedings';
    const authors = paper.authors.join(' and ');

    let fields = [];
    fields.push(`  author    = {${authors}}`);
    fields.push(`  title     = {${paper.title}}`);
    if (isJournal) {
      fields.push(`  journal   = {${paper.venue}}`);
    } else {
      fields.push(`  booktitle = {${paper.venue}}`);
    }
    fields.push(`  year      = {${paper.year}}`);
    if (paper.volume) fields.push(`  volume    = {${paper.volume}}`);
    if (paper.number) fields.push(`  number    = {${paper.number}}`);
    if (paper.pages) fields.push(`  pages     = {${paper.pages}}`);

    return `@${entryType}{${key},\n${fields.join(',\n')}\n}`;
  });

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
  eleventyConfig.addPassthroughCopy('style');
  eleventyConfig.addPassthroughCopy('files');

  return {
    dir: {
      input: '.',
      output: '_site'
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
};
