import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all articles and media images
    const [articles, mediaImages] = await Promise.all([
      base44.entities.Article.list('-created_date', 500),
      base44.entities.MediaImage.list('-created_date', 500),
    ]);

    let matched = 0;
    let skipped = 0;

    // For each article, try to find a matching image by filename
    for (const article of articles) {
      if (article.featured_image) {
        skipped++;
        continue; // Skip articles that already have featured images
      }

      // Extract filename variations from article title/slug for matching
      const searchTerms = [
        article.slug,
        article.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        article.title?.toLowerCase().replace(/\s+/g, '-'),
      ].filter(Boolean);

      // Find a matching image
      const matchedImage = mediaImages.find(img => {
        const imgName = img.title?.toLowerCase() || img.url.split('/').pop().toLowerCase();
        return searchTerms.some(term => imgName.includes(term) || term.includes(imgName.split('.')[0]));
      });

      if (matchedImage) {
        await base44.entities.Article.update(article.id, {
          featured_image: matchedImage.url,
        });
        matched++;
      }
    }

    return Response.json({
      success: true,
      matched,
      skipped,
      total: articles.length,
      message: `Matched ${matched} articles with images. ${skipped} articles already had featured images.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});