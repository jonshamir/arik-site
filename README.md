# arik-site

Run the local site by using "bun dev" and get a local link
Before upload run "bun run build"

1. Create a JSON file in papers/

Name it using the paper title in kebab-case, e.g. my-new-paper-title.json, with this structure:

{
"title": "My New Paper Title",
"authors": ["Author One", "Author Two", "Ariel Shamir"],
"year": 2025,
"abstract": "Abstract text here...",
"venue": "ACM SIGGRAPH",
"pages": "Article 42",
"volume": "44",
"number": "4",
"paperType": "journal",
"categories": ["Recent", "Image & Video Processing"],
"paperLink": "https://...",
"videoLink": null,
"projectLink": null,
"thumbnail": "/images/research/thumbnails/MyPaper.png",
"overviewImage": "/images/research/MyPaperTeaser.png"
}

2. Add images (optional but recommended)

Thumbnail: images/research/thumbnails/MyPaper.png
Overview/teaser: images/research/MyPaperTeaser.png

3. Key fields to note:

paperType: either "journal" or "conference" — controls BibTeX entry type (@article vs @inproceedings) and whether venue is labeled as journal or booktitle
categories: must match values from \_data/categories.js exactly. Add "Recent" to make it appear in the recent section
"Recent",
"Shape Analysis",
"3D Modelling & Fabrication",
"Image & Video Processing",
"Animation",
"Art, Sketches & Typography",
"Information Visualization",
"Seam Carving"

paperLink, videoLink, projectLink: set to null if not applicable
That's it — \_data/papers.js auto-loads all JSON files from the papers/ directory.

4. when you upload there are many index.html files you need to upload, not just the paper material! (copy the categories sub directory, and the "all" subdirectory in papers)
