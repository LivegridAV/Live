// Test helper: lets node resolve the extensionless relative imports the venue sources use ("../loading/prefetched").
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (error) {
    if (/^\.\.?\//.test(specifier) && !/\.\w+$/.test(specifier)) return next(`${specifier}.ts`, context);
    throw error;
  }
}

// Venue data modules import JSON without an import attribute (the bundler allows it); node needs one.
export async function load(url, context, next) {
  if (/\.json$/.test(new URL(url).pathname) && !context.importAttributes?.type) return next(url, { ...context, importAttributes: { ...context.importAttributes, type: "json" } });
  return next(url, context);
}
