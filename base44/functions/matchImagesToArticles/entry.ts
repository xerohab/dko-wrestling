import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch the migration JSON
    const jsonUrl = 'https://media.base44.com/files/public/6a0fab0df03ef3f099fbfaf0/199fa1e6f_16iSHOYu_posts.json';
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      return Response.json({ error: `Failed to fetch JSON: ${response.status} ${response.statusText}` }, { status: 500 });
    }
    const jsonData = await response.json();

    const tableEntry = jsonData.find(item => item.type === 'table');
    const posts = tableEntry?.data || [];

    if (posts.length === 0) {
      return Response.json({ error: 'No posts found in JSON', jsonLength: jsonData.length, tableEntry: !!tableEntry }, { status: 400 });
    }

    // Build map: post_id -> post_title for published posts
    const postIdToTitle = {};
    for (const post of posts) {
      if (post.post_type === 'post' && post.post_status === 'publish' && post.post_title) {
        postIdToTitle[post.ID] = post.post_title;
      }
    }

    // Build map: normalized_title -> first attachment filename (no ext, no size suffix)
    const normalize = str => str.toLowerCase().trim().replace(/\s+/g, ' ');

    const titleToImageFilename = {};
    for (const post of posts) {
      if (post.post_type === 'attachment' && post.post_mime_type?.startsWith('image/') && post.post_parent !== '0') {
        const parentTitle = postIdToTitle[post.post_parent];
        if (parentTitle && post.guid) {
          const key = normalize(parentTitle);
          if (!titleToImageFilename[key]) {
            const fullFilename = post.guid.split('/').pop();
            const filenameNoExt = fullFilename.split('.')[0].toLowerCase();
            titleToImageFilename[key] = filenameNoExt;
          }
        }
      }
    }

    console.log('Title to image count:', Object.keys(titleToImageFilename).length);
    console.log('Sample titles from JSON:', Object.keys(titleToImageFilename).slice(0, 5));

    // Fetch articles and media
    const [articles, mediaImages] = await Promise.all([
      base44.entities.Article.list('-created_date', 500),
      base44.entities.MediaImage.list('-created_date', 1000),
    ]);

    console.log(`Articles: ${articles.length}, Media: ${mediaImages.length}`);
    console.log(`Articles: ${articles.length}, Media: ${mediaImages.length}`);
    console.log('Sample article titles:', articles.slice(0, 5).map(a => a.title));

    // Build media map: clean filename (no hash prefix, no size suffix) -> URL
    // Uploaded filenames look like: "e3fae9b90_op-2-300x200.png" -> we want "op-2"
    const mediaFilenameToUrl = {};
    for (const img of mediaImages) {
      const urlFilename = img.url.split('/').pop();
      const filenameNoExt = urlFilename.split('.')[0].toLowerCase();
      // Strip leading hash prefix (e.g. "e3fae9b90_") 
      const filenameNoHash = filenameNoExt.replace(/^[a-f0-9]+_/, '');
      // Strip trailing size suffix (e.g. "-300x169")
      const filenameClean = filenameNoHash.replace(/-\d+x\d+$/, '');
      if (!mediaFilenameToUrl[filenameClean]) {
        mediaFilenameToUrl[filenameClean] = img.url;
      }
    }

    console.log('Sample media keys:', Object.keys(mediaFilenameToUrl).slice(0, 10));

    let matched = 0;
    let skipped = 0;
    let noMapping = 0;
    const matchDetails = [];

    for (const article of articles) {
      if (article.featured_image) {
        skipped++;
        continue;
      }

      const key = normalize(article.title);
      const filenameNoExt = titleToImageFilename[key];

      if (!filenameNoExt) {
        noMapping++;
        continue;
      }

      const imageUrl = mediaFilenameToUrl[filenameNoExt];

      if (imageUrl) {
        await base44.entities.Article.update(article.id, { featured_image: imageUrl });
        matched++;
        matchDetails.push({ title: article.title, image: filenameNoExt });
      } else {
        noMapping++;
        console.log(`Media not found for "${article.title}", looking for: ${filenameNoExt}`);
      }
    }

    // Debug: show sample data
    const sampleArticleTitles = articles.slice(0, 5).map(a => a.title);
    const sampleMediaKeys = Object.keys(mediaFilenameToUrl).slice(0, 10);
    const jsonTitles = Object.keys(titleToImageFilename).slice(0, 10);

    return Response.json({
      success: true,
      matched,
      skipped,
      noMapping,
      total: articles.length,
      totalMedia: mediaImages.length,
      matchDetails,
      debug: { sampleArticleTitles, sampleMediaKeys, jsonTitles },
      message: `Matched ${matched} articles with images. ${skipped} already had images. ${noMapping} had no matching media.`,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});