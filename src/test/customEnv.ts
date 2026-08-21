import type { Environment } from "vitest/environments";
import { builtinEnvironments } from "vitest/environments";

export default <Environment>{
  name: "custom-jsdom",
  transformMode: "web",
  async setup(global, options) {
    // Preserve Node native AbortController, AbortSignal, File, Blob, FormData before jsdom override
    // required for MSW 2.x and Axios built-in fetch adapter constructor identity checks.
    const NativeAbortController = global.AbortController;
    const NativeAbortSignal = global.AbortSignal;
    const NativeFile = global.File;
    const NativeBlob = global.Blob;
    const NativeFormData = global.FormData;

    const jsdomEnv = builtinEnvironments.jsdom;
    const result = await jsdomEnv.setup(global, options);

    const globalsToRestore = [
      { key: "AbortController", value: NativeAbortController },
      { key: "AbortSignal", value: NativeAbortSignal },
      { key: "File", value: NativeFile },
      { key: "Blob", value: NativeBlob },
      { key: "FormData", value: NativeFormData },
    ] as const;

    for (const { key, value } of globalsToRestore) {
      if (value) {
        Object.defineProperty(global, key, {
          configurable: true,
          writable: true,
          value,
        });

        if (global.window) {
          Object.defineProperty(global.window, key, {
            configurable: true,
            writable: true,
            value,
          });
        }
      }
    }

    return result;
  },
};
