Object.defineProperty(exports, "__esModule", { value: true });
exports.loadStack = exports.mergeRequiredAPIs = exports.extractStack = void 0; const path = require("path");
const url = require("url");
const params = require("../params");
/**
 * Dynamically load import function to prevent TypeScript from
 * transpiling into a require.
 *
 * See https://github.com/microsoft/TypeScript/issues/43329.
 *
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function("modulePath", "return import(modulePath)");
async function loadModule(functionsDir) {
    const absolutePath = path.resolve(functionsDir);
    try {
        return require(path.resolve(absolutePath));
    }
    catch (e) {
        if (e.code === "ERR_REQUIRE_ESM") {
            // This is an ESM package!
            const modulePath = require.resolve(absolutePath);
            // Resolve module path to file:// URL. Required for windows support.
            const moduleURL = url.pathToFileURL(modulePath).href;
            return await dynamicImport(moduleURL);
        }
        throw e;
    }
}
/* @internal */
function extractStack(module, endpoints, requiredAPIs, prefix = "") {
    for (const [name, valAsUnknown] of Object.entries(module)) {
        // We're introspecting untrusted code here. Any is appropraite
        const val = valAsUnknown;
        if (typeof val === "function" && val.__endpoint && typeof val.__endpoint === "object") {
            const funcName = prefix + name;
            endpoints[funcName] = {
                ...val.__endpoint,
                entryPoint: funcName.replace(/-/g, "."),
            };
            if (val.__requiredAPIs && Array.isArray(val.__requiredAPIs)) {
                requiredAPIs.push(...val.__requiredAPIs);
            }
        }
        else if (typeof val === "object" && val !== null) {
            extractStack(val, endpoints, requiredAPIs, prefix + name + "-");
        }
    }
}
exports.extractStack = extractStack;
/* @internal */
function mergeRequiredAPIs(requiredAPIs) {
    const apiToReasons = {};
    for (const { api, reason } of requiredAPIs) {
        const reasons = apiToReasons[api] || new Set();
        reasons.add(reason);
        apiToReasons[api] = reasons;
    }
    const merged = [];
    for (const [api, reasons] of Object.entries(apiToReasons)) {
        merged.push({ api, reason: Array.from(reasons).join(" ") });
    }
    return merged;
}
exports.mergeRequiredAPIs = mergeRequiredAPIs;
/* @internal */
async function loadStack(functionsDir) {
    const endpoints = {};
    const requiredAPIs = [];
    const mod = await loadModule(functionsDir);
    extractStack(mod, endpoints, requiredAPIs);
    const stack = {
        endpoints,
        specVersion: "v1alpha1",
        requiredAPIs: mergeRequiredAPIs(requiredAPIs),
    };
    if (params.declaredParams.length > 0) {
        stack.params = params.declaredParams.map((p) => p.toSpec());
    }
    return stack;
}
exports.loadStack = loadStack;
