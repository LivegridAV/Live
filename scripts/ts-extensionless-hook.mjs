// Test helper: lets node resolve the extensionless relative imports the venue sources use ("../loading/prefetched").
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (error) {
    if (/^\.\.?\//.test(specifier) && !/\.\w+$/.test(specifier)) return next(`${specifier}.ts`, context);
    throw error;
  }
}
