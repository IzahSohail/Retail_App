import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Upload an image file to Supabase storage
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} fileName - The file name with extension
 * @param {string} productId - The product ID for organizing files
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<{success: boolean, publicUrl?: string, error?: string}>}
 */
export async function uploadProductImage(fileBuffer, fileName, productId, contentType) {
  try {
    // Create a unique file path: products/{productId}/image_{timestamp}_{filename}
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `image_${timestamp}.${fileExtension}`;
    const filePath = `products/${productId}/${uniqueFileName}`;

    // Upload file to Supabase storage
    const bucketName = process.env.SUPABASE_BUCKET || 'products';
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      filePath: filePath
    };

  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete an image from Supabase storage
 * @param {string} filePath - The file path in storage
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteProductImage(filePath) {
  try {
    const bucketName = process.env.SUPABASE_BUCKET || 'products';
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Image delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
