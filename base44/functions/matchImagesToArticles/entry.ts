import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch the migration JSON from the uploaded file
    const jsonUrl = 'https://media.base44.com/files/public/6a0fab0df03ef3f099fbfaf0/199fa1e6f_16iSHOYu_posts.json';
    const response = await fetch(jsonUrl);
    const jsonData = await response.json();

    // Get the table data (3rd item in array)
    const tableEntry = jsonData.find(item => item.type === 'table');
    const posts = tableEntry?.data || [];

    // Build a map: post_id -> post_name (slug) for published posts
    const postIdToSlug = {};
    for (const post of posts) {
      if (post.post_type === 'post' && post.post_status === 'publish' && post.post_name) {
        postIdToSlug[post.ID] = post.post_name;
      }
    }

    // Build a map: article_slug -> image_filename from attachments
    // Each attachment has post_parent (the post ID) and guid (the image URL with filename)
    const slugToImageFilename = {};
    for (const post of posts) {
      if (post.post_type === 'attachment' && post.post_mime_type?.startsWith('image/') && post.post_parent !== '0') {
        const parentId = post.post_parent;
        const parentSlug = postIdToSlug[parentId];
        if (parentSlug && post.guid) {
          // Extract just the filename without extension
          const fullFilename = post.guid.split('/').pop(); // e.g. "IMG_1690.jpeg"
          const filenameNoExt = fullFilename.split('.')[0].toLowerCase(); // e.g. "img_1690"
          // Only store first attachment per post (featured image)
          if (!slugToImageFilename[parentSlug]) {
            slugToImageFilename[parentSlug] = { filenameNoExt, fullFilename };
          }
        }
      }
    }

    console.log('Slug to image mapping:', JSON.stringify(slugToImageFilename, null, 2));

    // Fetch all articles and media images from the app
    const [articles, mediaImages] = await Promise.all([
      base44.entities.Article.list('-created_date', 500),
      base44.entities.MediaImage.list('-created_date', 500),
    ]);

    console.log(`Articles: ${articles.length}, Media images: ${mediaImages.length}`);

    // Build a map from media image filename (no extension) -> URL
    const mediaFilenameToUrl = {};
    for (const img of mediaImages) {
      const urlFilename = img.url.split('/').pop(); // e.g. "IMG_1690.jpeg"
      const filenameNoExt = urlFilename.split('.')[0].toLowerCase();
      mediaFilenameToUrl[filenameNoExt] = img.url;
      // Also store title-based lookup
      if (img.title) {
        mediaFilenameToUrl[img.title.toLowerCase()] = img.url;
      }
    }

    console.log('Media filename map keys:', Object.keys(mediaFilenameToUrl).slice(0, 20));

    let matched = 0;
    let skipped = 0;
    let noMapping = 0;
    const matchDetails = [];

    for (const article of articles) {
      if (article.featured_image) {
        skipped++;
        continue;
      }

      const articleSlug = article.slug;
      const mapping = slugToImageFilename[articleSlug];

      if (!mapping) {
        noMapping++;
        continue;
      }

      // Try to find the media image by filename
      const imageUrl = mediaFilenameToUrl[mapping.filenameNoExt];

      if (imageUrl) {
        await base44.entities.Article.update(article.id, { featured_image: imageUrl });
        matched++;
        matchDetails.push({ slug: articleSlug, image: mapping.fullFilename });
      } else {
        noMapping++;
        console.log(`No media found for article "${articleSlug}", looking for filename: ${mapping.filenameNoExt}`);
      }
    }

    return Response.json({
      success: true,
      matched,
      skipped,
      noMapping,
      total: articles.length,
      matchDetails,
      message: `Matched ${matched} articles with images. ${skipped} already had images. ${noMapping} had no matching media found.`,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});