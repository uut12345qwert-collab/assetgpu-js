/**
 * gpu-backend.js
 *
 * Isolates headless WebGPU device acquisition behind one interface.
 * Native Node WebGPU bindings are the least stable dependency in this
 * stack (platform-specific, version-sensitive). Everything downstream
 * talks to `device`/`adapter` objects that match the standard WebGPU
 * API shape, so swapping the backend later means editing only this file.
 */

let cachedAdapter = null;
let cachedDevice = null;

export async function getGpuDevice({ powerPreference = 'high-performance' } = {}) {
  if (cachedDevice) {
    return { adapter: cachedAdapter, device: cachedDevice };
  }

  let gpuGlobals;
  try {
    gpuGlobals = await import('webgpu');
  } catch (err) {
    throw new Error(
      'Failed to load the "webgpu" native binding. This package wraps Dawn ' +
      'and is platform/Node-version sensitive. Verify it installed correctly ' +
      'for your platform (`npm ls webgpu`), or supply a custom backend via ' +
      'the `gpuBackend` option. Original error: ' + err.message
    );
  }

  const { create, globals } = gpuGlobals;
  Object.assign(globalThis, globals);
  const gpu = create([]);

  const adapter = await gpu.requestAdapter({ powerPreference });
  if (!adapter) {
    throw new Error(
      'No WebGPU adapter found. Headless environments often need a software ' +
      'fallback (e.g. SwiftShader / lavapipe) or a GPU-enabled container. ' +
      'Check your platform\'s WebGPU/Dawn setup.'
    );
  }

  const device = await adapter.requestDevice();
  device.lost.then((info) => {
    console.error(`[assetgpu] GPU device lost: ${info.message} (reason: ${info.reason})`);
    cachedDevice = null;
    cachedAdapter = null;
  });

  cachedAdapter = adapter;
  cachedDevice = device;

  return { adapter, device };
}

export function _setGpuDeviceForTesting(device, adapter = null) {
  cachedDevice = device;
  cachedAdapter = adapter;
}

export function _resetGpuDeviceCache() {
  cachedDevice = null;
  cachedAdapter = null;
}
