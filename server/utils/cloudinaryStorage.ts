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
  console.log(`[Cloudinary] Starting upload: ${fileName}, ${fileBuffer?.length ?? 'null'} bytes`);
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
        console.log(`[Cloudinary] Upload complete: ${result.public_id}, ${result.bytes} bytes — verifying...`);
        try {
          await cloudinary.api.resource(result.public_id, { resource_type: 'raw' });
          console.log(`[Cloudinary] Verification passed: ${result.public_id}`);
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
