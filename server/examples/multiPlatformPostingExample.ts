/* eslint-disable no-console */
/**
 * Multi-Platform Social Media Posting Example
 *
 * Demonstrates how to use the four new services together to:
 * 1. Get platform specifications
 * 2. Format content for each platform
 * 3. Resize images for each platform
 * 4. Post to n8n webhooks for automated publishing
 *
 * This is a complete end-to-end example.
 */

import { logger } from '../lib/logger';

// Import all four services
import { getPlatformSpecs, getAvailablePlatforms, isPlatformSupported } from '../services/platformSpecsService';

import {
  formatContentForPlatform,
  formatContentForMultiplePlatforms,
  generateCaptionSuggestions,
} from '../services/contentFormatterService';

import { generatePlatformImages, validateImageForPlatform } from '../services/imageSizingService';

import { postToMultiplePlatforms, validateN8nConfig } from '../services/n8nPostingService';

/**
 * Example 1: Check available platforms
 */
async function example1_listPlatforms() {
  console.log('\n=== EXAMPLE 1: List Available Platforms ===\n');

  const platforms = getAvailablePlatforms();
  console.log(`Total platforms supported: ${platforms.length}`);
  console.log('Platforms:', platforms.join(', '));

  // Check if specific platforms are supported
  console.log('\nPlatform checks:');
  console.log(`Instagram supported: ${isPlatformSupported('instagram')}`);
  console.log(`LinkedIn supported: ${isPlatformSupported('linkedin')}`);
  console.log(`MySpace supported: ${isPlatformSupported('myspace')}`); // false
}

/**
 * Example 2: Get platform specifications
 */
async function example2_getPlatformSpecs() {
  console.log('\n=== EXAMPLE 2: Get Platform Specifications ===\n');

  const instagramSpecs = getPlatformSpecs('instagram');
  if (instagramSpecs) {
    console.log('Instagram Feed Specs:');
    console.log(`- Caption limit: ${instagramSpecs.caption.maxLength} chars`);
    console.log(`- Recommended caption: ${instagramSpecs.caption.recommended} chars`);
    console.log(`- Hashtag limit: ${instagramSpecs.hashtags.max}`);
    console.log(`- Recommended hashtags: ${instagramSpecs.hashtags.recommended}`);
    console.log(`- Image formats: ${instagramSpecs.image.formats.join(', ')}`);
    console.log(`- Max file size: ${instagramSpecs.image.maxSizeMB}MB`);
    console.log(`- Aspect ratios:`);
    instagramSpecs.image.aspectRatios.forEach((ar) => {
      console.log(`  - ${ar.name}: ${ar.ratio} (${ar.width}x${ar.height}px) ${ar.recommended ? '✅ RECOMMENDED' : ''}`);
    });
  }

  const linkedinSpecs = getPlatformSpecs('linkedin');
  if (linkedinSpecs) {
    console.log('\nLinkedIn Specs:');
    console.log(`- Caption limit: ${linkedinSpecs.caption.maxLength} chars`);
    console.log(`- Truncation point: ${linkedinSpecs.caption.truncationPoint} chars ("See more")`);
    console.log(`- Professional platform: ${linkedinSpecs.features.professionalPlatform}`);
  }
}

/**
 * Example 3: Format content for a single platform
 */
async function example3_formatSinglePlatform() {
  console.log('\n=== EXAMPLE 3: Format Content for Instagram ===\n');

  const caption = `🚀 Excited to announce our new product launch!

This revolutionary tool will change the way you work. Built with passion, tested by experts, loved by users.

Perfect for entrepreneurs, small businesses, and anyone looking to scale their operations efficiently.

Check out the link in our bio to learn more! https://example.com/product

Don't miss our limited-time launch offer! 💥`;

  const hashtags = [
    'ProductLaunch',
    'Startup',
    'Entrepreneurship',
    'BusinessGrowth',
    'Innovation',
    'TechStartup',
    'SmallBusiness',
    'Productivity',
    'SaaS',
    'LaunchDay',
  ];

  const formatted = await formatContentForPlatform(caption, hashtags, 'instagram');

  console.log('Original caption length:', caption.length);
  console.log('Formatted caption length:', formatted.characterCount);
  console.log('Hashtag count:', formatted.hashtagCount);
  console.log('Truncated:', formatted.truncated);
  console.log('Valid:', formatted.isValid);
  console.log('Emoji count:', formatted.emojiCount);

  if (formatted.warnings.length > 0) {
    console.log('\nWarnings:');
    formatted.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }

  if (formatted.errors.length > 0) {
    console.log('\nErrors:');
    formatted.errors.forEach((e) => console.log(`  ❌ ${e}`));
  }

  console.log('\nFormatted Caption:');
  console.log('---');
  console.log(formatted.caption);
  console.log('---');

  console.log('\nFormatted Hashtags:', formatted.hashtags.join(' '));
}

/**
 * Example 4: Format content for multiple platforms
 */
async function example4_formatMultiplePlatforms() {
  console.log('\n=== EXAMPLE 4: Format Content for Multiple Platforms ===\n');

  const caption = 'Introducing our latest innovation! Perfect for modern businesses. Learn more at example.com 🚀';
  const hashtags = ['Innovation', 'Business', 'Tech', 'Startup', 'ProductLaunch'];
  const platforms = ['instagram', 'linkedin', 'twitter', 'facebook'];

  const results = await formatContentForMultiplePlatforms(caption, hashtags, platforms);

  console.log('Original caption:', caption);
  console.log('Original hashtags:', hashtags.join(', '));
  console.log('\nFormatted for each platform:\n');

  for (const [platform, formatted] of Object.entries(results)) {
    console.log(`${platform.toUpperCase()}:`);
    console.log(`  - Caption length: ${formatted.characterCount} chars`);
    console.log(`  - Hashtags: ${formatted.hashtagCount}`);
    console.log(`  - Valid: ${formatted.isValid}`);
    console.log(`  - Warnings: ${formatted.warnings.length}`);
    if (formatted.linkHandling?.message) {
      console.log(`  - Link handling: ${formatted.linkHandling.message}`);
    }
    console.log('');
  }
}

/**
 * Example 5: Generate platform-optimized images
 */
async function example5_generatePlatformImages() {
  console.log('\n=== EXAMPLE 5: Generate Platform-Optimized Images ===\n');

  // Example Cloudinary URL
  const sourceImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  const platforms = ['instagram', 'linkedin', 'twitter', 'pinterest'];

  console.log('Source image:', sourceImageUrl);
  console.log('Generating images for:', platforms.join(', '));
  console.log('');

  const images = await generatePlatformImages(sourceImageUrl, platforms);

  for (const [platform, image] of Object.entries(images)) {
    console.log(`${platform.toUpperCase()}:`);
    console.log(`  - Dimensions: ${image.width}x${image.height}px`);
    console.log(`  - Aspect ratio: ${image.aspectRatio}`);
    console.log(`  - Format: ${image.format}`);
    console.log(`  - Estimated size: ${image.estimatedSizeKB}KB`);
    console.log(`  - Transformation: ${image.cloudinaryTransform}`);
    console.log(`  - URL: ${image.url}`);
    console.log('');
  }
}

/**
 * Example 6: Validate image for platform
 */
async function example6_validateImage() {
  console.log('\n=== EXAMPLE 6: Validate Image for Platform ===\n');

  // Test various images
  const testCases = [
    {
      name: 'Good Instagram image',
      width: 1080,
      height: 1350,
      fileSizeMB: 2.5,
      format: 'jpg',
      platform: 'instagram',
    },
    {
      name: 'Too small for Instagram',
      width: 200,
      height: 200,
      fileSizeMB: 0.5,
      format: 'jpg',
      platform: 'instagram',
    },
    {
      name: 'Too large file size',
      width: 1080,
      height: 1080,
      fileSizeMB: 15,
      format: 'png',
      platform: 'instagram',
    },
    {
      name: 'Wrong format for Instagram',
      width: 1080,
      height: 1080,
      fileSizeMB: 3,
      format: 'gif',
      platform: 'instagram',
    },
  ];

  for (const test of testCases) {
    const validation = validateImageForPlatform(test.width, test.height, test.fileSizeMB, test.format, test.platform);

    console.log(`${test.name}:`);
    console.log(`  Valid: ${validation.isValid ? '✅' : '❌'}`);
    if (validation.errors.length > 0) {
      validation.errors.forEach((e) => console.log(`  Error: ${e}`));
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((w) => console.log(`  Warning: ${w}`));
    }
    console.log('');
  }
}

/**
 * Example 7: Complete end-to-end multi-platform posting workflow
 */
async function example7_completeWorkflow() {
  console.log('\n=== EXAMPLE 7: Complete Multi-Platform Posting Workflow ===\n');

  // Step 1: Validate n8n configuration
  console.log('Step 1: Validating n8n configuration...');
  const n8nValidation = validateN8nConfig();
  if (!n8nValidation.isValid) {
    console.log('❌ n8n configuration invalid:');
    n8nValidation.errors.forEach((e) => console.log(`  - ${e}`));
    console.log('\nSkipping posting step (would work in production with N8N_BASE_URL configured)');
  } else {
    console.log('✅ n8n configuration valid');
  }
  console.log('');

  // Step 2: Define content
  console.log('Step 2: Defining content...');
  const caption = `🎉 Big news! We're launching something incredible today.

After months of hard work, we're thrilled to introduce a game-changing solution for modern businesses.

Built for speed, designed for scale, loved by teams worldwide. ⚡️

Try it now and see the difference!`;

  const hashtags = ['ProductLaunch', 'Innovation', 'Business', 'Tech', 'Startup', 'Entrepreneurship', 'Growth'];

  const sourceImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
  const platforms = ['instagram', 'linkedin', 'twitter', 'facebook'];
  const userId = 'user_123';
  const scheduledPostId = 'post_456';

  console.log('Platforms:', platforms.join(', '));
  console.log('Original caption length:', caption.length);
  console.log('Hashtags:', hashtags.length);
  console.log('');

  // Step 3: Format content for all platforms
  console.log('Step 3: Formatting content for each platform...');
  const formattedContent = await formatContentForMultiplePlatforms(caption, hashtags, platforms);

  console.log('✅ Content formatted for', Object.keys(formattedContent).length, 'platforms');
  console.log('');

  // Step 4: Generate platform-optimized images
  console.log('Step 4: Generating platform-optimized images...');
  const platformImages = await generatePlatformImages(sourceImageUrl, platforms);

  const imageUrls: Record<string, string> = {};
  for (const [platform, image] of Object.entries(platformImages)) {
    imageUrls[platform] = image.url;
  }

  console.log('✅ Images generated for', Object.keys(platformImages).length, 'platforms');
  console.log('');

  // Step 5: Post to n8n (if configured)
  if (n8nValidation.isValid) {
    console.log('Step 5: Posting to n8n webhooks...');

    const postResults = await postToMultiplePlatforms(platforms, formattedContent, imageUrls, userId, scheduledPostId, {
      generationId: 'gen_789',
      scheduledFor: new Date(),
      callbackUrl: 'https://api.example.com/n8n/callback',
    });

    console.log('✅ Posts submitted to n8n\n');

    for (const [platform, result] of Object.entries(postResults)) {
      console.log(`${platform.toUpperCase()}:`);
      console.log(`  Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
      if (result.workflowExecutionId) {
        console.log(`  Execution ID: ${result.workflowExecutionId}`);
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log('');
    }
  } else {
    console.log('Step 5: Posting skipped (n8n not configured)');
    console.log('');
    console.log('Would post to these endpoints:');
    platforms.forEach((platform) => {
      console.log(
        `  - ${platform}: ${process.env['N8N_BASE_URL'] || 'https://n8n.example.com'}/webhook/post/${platform}`,
      );
    });
    console.log('');
  }

  console.log('✅ Workflow complete!');
}

/**
 * Example 8: Generate caption suggestions
 */
async function example8_captionSuggestions() {
  console.log('\n=== EXAMPLE 8: Generate Caption Suggestions ===\n');

  const longCaption = `This is a really long caption that might need to be truncated for different platforms. It contains a lot of information about our product, including features, benefits, pricing, and a call to action. We want to make sure the most important information is visible even when truncated.`;

  const platforms = ['twitter', 'instagram', 'linkedin'];

  for (const platform of platforms) {
    console.log(`${platform.toUpperCase()} suggestions:`);
    const suggestions = generateCaptionSuggestions(longCaption, platform);
    suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. (${suggestion.length} chars) ${suggestion.substring(0, 80)}...`);
    });
    console.log('');
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Multi-Platform Social Media Posting - Complete Examples      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    await example1_listPlatforms();
    await example2_getPlatformSpecs();
    await example3_formatSinglePlatform();
    await example4_formatMultiplePlatforms();
    await example5_generatePlatformImages();
    await example6_validateImage();
    await example7_completeWorkflow();
    await example8_captionSuggestions();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    logger.error({ error }, 'Example execution failed');
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

// Export functions for use in other files
export {
  example1_listPlatforms,
  example2_getPlatformSpecs,
  example3_formatSinglePlatform,
  example4_formatMultiplePlatforms,
  example5_generatePlatformImages,
  example6_validateImage,
  example7_completeWorkflow,
  example8_captionSuggestions,
  runAllExamples,
};
