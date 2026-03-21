const categories = [
  "Recent",
  "Shape Analysis",
  "3D Modelling & Fabrication",
  "Image & Video Processing",
  "Animation",
  "Art, Sketches & Typography",
  "Information Visualization",
  "Seam Carving"
];

const toSlug = (cat) => cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

module.exports = { categories, toSlug };
