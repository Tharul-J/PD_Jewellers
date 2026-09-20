import { v2 as cloudinary } from 'cloudinary';

const configure = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

export const uploadGlbToCloudinary = (fileBuffer: Buffer, fileName: string): Promise<string | null> => {
  configure();
  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder:        '3d_models',
        public_id:     fileName.replace(/\.[^/.]+$/, ''),
        overwrite:     true,
      },
      async (error, result) => {
        if (error || !result || !result.secure_url || result.bytes === 0) {
          console.error('Cloudinary upload error:', JSON.stringify(error, null, 2), error?.message, 'http_code:', (error as any)?.http_code, 'result:', result ? `bytes=${result.bytes}` : 'null');
          resolve(null);
          return;
        }
        try {
          await cloudinary.api.resource(result.public_id, { resource_type: 'raw' });
          resolve(result.secure_url);
        } catch (verifyErr) {
          console.error(`[Cloudinary] Upload reported success but resource verification failed for ${result.public_id}:`, (verifyErr as any)?.message);
          resolve(null);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const deleteGlbFromCloudinary = async (publicId: string): Promise<boolean> => {
  configure();
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

export const uploadImageToCloudinary = (fileBuffer: Buffer, publicId: string): Promise<string | null> => {
  configure();
  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder:        'pd-jewellers/avatars',
        public_id:     publicId,
        overwrite:     true,
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      },
      (error, result) => {
        if (error || !result || !result.secure_url) {
          console.error('Cloudinary image upload error:', error);
          resolve(null);
          return;
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Uploads a wide banner image and returns its public_id alongside the URL.
 *
 * Separate from `uploadImageToCloudinary`, which is pinned to the avatar folder
 * and a 400x400 face crop, and returns only the URL — a banner needs its own
 * folder, a landscape transform, and the id so the old asset can be destroyed
 * when it is replaced.
 */
export const uploadBannerToCloudinary = (
  fileBuffer: Buffer,
  folder: string,
  publicId: string
): Promise<{ url: string; publicId: string } | null> => {
  configure();
  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder,
        public_id: publicId,
        overwrite: true,
        transformation: [{ width: 1600, height: 600, crop: 'fill', gravity: 'auto' }],
      },
      (error, result) => {
        if (error || !result || !result.secure_url) {
          console.error('Cloudinary banner upload error:', error);
          resolve(null);
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const deleteImageFromCloudinary = async (publicId: string): Promise<boolean> => {
  configure();
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary image delete error:', error);
    return false;
  }
};
