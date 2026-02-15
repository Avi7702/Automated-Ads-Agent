import { APIRequestContext } from '@playwright/test';
import { apiGet, apiPost, apiPut, apiDelete, apiPostMultipart } from './api';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed a product via multipart form upload.
 * Uses the test-upload.png fixture as the product image.
 */
export async function seedProduct(request: APIRequestContext, name: string, category?: string) {
  const imagePath = path.resolve(__dirname, '..', 'fixtures', 'test-upload.png');
  const imageBuffer = fs.readFileSync(imagePath);

  return apiPostMultipart(request, '/api/products', {
    name,
    ...(category ? { category } : {}),
    image: {
      name: 'test-upload.png',
      mimeType: 'image/png',
      buffer: imageBuffer,
    },
  });
}

/**
 * Seed a generation by triggering the transform endpoint.
 * Note: This may take time as it involves AI generation.
 */
export async function seedGeneration(request: APIRequestContext, productId: string, prompt: string) {
  return apiPost(request, '/api/transform', {
    productId,
    prompt,
  });
}

/**
 * Seed or update the brand profile.
 */
export async function seedBrandProfile(
  request: APIRequestContext,
  data: { companyName: string; industry?: string; brandVoice?: string },
) {
  return apiPut(request, '/api/brand-profile', data);
}

/**
 * Delete all test products (fetches list, deletes each).
 * Returns the number of products deleted.
 */
export async function deleteAllTestProducts(request: APIRequestContext): Promise<number> {
  const response = await apiGet(request, '/api/products');
  if (!response.ok()) return 0;

  const products = await response.json();
  const list = Array.isArray(products) ? products : products?.products || [];

  for (const product of list) {
    await apiDelete(request, `/api/products/${product.id}`);
  }

  return list.length;
}

/**
 * Get the current product count.
 */
export async function getProductCount(request: APIRequestContext): Promise<number> {
  const response = await apiGet(request, '/api/products');
  if (!response.ok()) return 0;

  const products = await response.json();
  const list = Array.isArray(products) ? products : products?.products || [];
  return list.length;
}

/**
 * Get all products.
 */
export async function getProducts(request: APIRequestContext) {
  const response = await apiGet(request, '/api/products');
  if (!response.ok()) return [];

  const products = await response.json();
  return Array.isArray(products) ? products : products?.products || [];
}

/**
 * Get all generations.
 */
export async function getGenerations(request: APIRequestContext) {
  const response = await apiGet(request, '/api/generations');
  if (!response.ok()) return [];

  return response.json();
}

/**
 * Delete a specific product by ID.
 */
export async function deleteProduct(request: APIRequestContext, productId: string) {
  return apiDelete(request, `/api/products/${productId}`);
}

/**
 * Delete a specific generation by ID.
 */
export async function deleteGeneration(request: APIRequestContext, generationId: string) {
  return apiDelete(request, `/api/generations/${generationId}`);
}
