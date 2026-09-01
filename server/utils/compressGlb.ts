import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

/**
 * Compress a GLB buffer using meshopt compression.
 * Returns a new compressed GLB buffer.
 * If compression fails, returns the original buffer unchanged (fail-safe).
 */
export async function compressGlb(inputBuffer: Buffer): Promise<Buffer> {
  try {
    await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);

    // EXTMeshoptCompression resolves its encoder/decoder via these named IO
    // dependencies at prewrite/write time — registerExtensions() alone leaves
    // them unset and the write step throws reading encodeFilterOct on undefined.
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({
        'meshopt.encoder': MeshoptEncoder,
        'meshopt.decoder': MeshoptDecoder,
      });
    const document = await io.readBinary(new Uint8Array(inputBuffer));

    // Some uploads already carry KHR_mesh_quantization (e.g. re-exported from a
    // tool, or already optimized upstream) — its POSITION/NORMAL accessors are
    // raw integers compensated by a node scale/translation. quantize() (which
    // meshopt() runs internally) computes its quantization volume from the
    // accessor's raw values, so quantizing an already-quantized accessor treats
    // those integers as object-space floats and corrupts geometry (observed:
    // X/Z collapsing to a single value). Dequantize back to plain floats first
    // so meshopt always starts from a clean, real-unit accessor.
    const usedExtensions = document.getRoot().listExtensionsUsed().map((e) => e.extensionName);
    if (usedExtensions.includes('KHR_mesh_quantization')) {
      await document.transform(dequantize());
    }

    await document.transform(
      meshopt({ encoder: MeshoptEncoder })
    );

    const compressedArray = await io.writeBinary(document);
    const compressedBuffer = Buffer.from(compressedArray);

    const savings = ((1 - compressedBuffer.length / inputBuffer.length) * 100).toFixed(1);
    console.log(
      `GLB compression: ${(inputBuffer.length / 1024).toFixed(0)}KB → ${(compressedBuffer.length / 1024).toFixed(0)}KB (${savings}% saved)`
    );

    return compressedBuffer;
  } catch (err) {
    console.error('GLB compression failed, using original:', err);
    return inputBuffer;
  }
}
