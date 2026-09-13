const { HtmlBasePlugin } = require('@11ty/eleventy');
const { categories, toSlug } = require('./_data/categories.js');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  // Add toSlug filter for Nunjucks
  eleventyConfig.addFilter('toSlug', toSlug);

  // Add videoEmbedUrl filter: converts Vimeo/YouTube watch URLs to embed URLs
  eleventyConfig.addFilter('videoEmbedUrl', function (url) {
    if (!url) return null;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    const youtube = url.match(/youtube\.com\/watch\?v=([\w-]+)/);
    if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
    return null;
  });

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

  // Collection: papers grouped by year, newest first, clustering all years
  // before 2005 into a single "Before 2005" group.
  eleventyConfig.addCollection('papersByYear', function (collectionApi) {
    const OLDEST_SEPARATE_YEAR = 2006;
    const allPapers = require('./_data/papers.js')();
    const sorted = [...allPapers].sort((a, b) => b.year - a.year);

    const groups = [];
    let currentGroup = null;
    for (const paper of sorted) {
      const label = paper.year < OLDEST_SEPARATE_YEAR ? `Before ${OLDEST_SEPARATE_YEAR}` : String(paper.year);
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, slug: toSlug(label), papers: [] };
        groups.push(currentGroup);
      }
      currentGroup.papers.push(paper);
    }
    return groups;
  });

  // Ignore non-template files
  eleventyConfig.ignores.add('README.md');
  eleventyConfig.ignores.add('CLAUDE.md');
  eleventyConfig.ignores.add('siteUpload');

  // Passthrough copy
  eleventyConfig.addPassthroughCopy('images');
  eleventyConfig.addPassthroughCopy('papers');
  eleventyConfig.addPassthroughCopy('style');
  eleventyConfig.addPassthroughCopy('files');
  eleventyConfig.addPassthroughCopy('index.asp');

  return {
    dir: {
      input: '.',
      output: process.env.npm_lifecycle_event === 'build' ? 'siteUpload' : '_site'
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk'
  };
};
