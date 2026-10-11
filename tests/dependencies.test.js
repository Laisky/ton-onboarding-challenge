const path = require("path");
const vm = require("vm");
const nativeHttp = require("http");
const moduleRoot = process.env.DEPENDENCY_MODULE_ROOT || path.resolve(__dirname, "../node_modules");
const load = name => require(path.join(moduleRoot, name));
test("JSON5 prototype-looking input remains an own property", () => {
  const data = load("json5").parse('{safe: "hello", "__proto__": {polluted: true}}');
  expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
  expect(Object.prototype.hasOwnProperty.call(data, "__proto__")).toBe(true);
  expect(data.safe).toBe("hello");
  expect({}.polluted).toBeUndefined();
});
test("glob matching preserves nested alternatives and excludes other paths", () => {
  const matches = load("micromatch")(
    ["src/item/a.ts", "src/giver/b.ts", "src/lib/c.ts"],
    "src/{item,giver}/*.ts",
  );
  expect(matches).toEqual(["src/item/a.ts", "src/giver/b.ts"]);
  expect(load("braces").expand("nft/{1..3}")).toEqual(["nft/1", "nft/2", "nft/3"]);
});
test("Babel generation preserves executable JavaScript and source maps", () => {
  const result = load("@babel/core").transformSync('const greet = name => "Hello " + name; greet("TON");',
    {configFile: false, babelrc: false, filename: "example.js", sourceMaps: true});
  expect(vm.runInNewContext(result.code)).toBe("Hello TON");
  expect(result.map.sources).toContain("example.js");
});
test("Babel evaluation refuses constructor-based code execution", () => {
  const babel = load("@babel/core");
  const ast = babel.parseSync('String({toString: Number.constructor(\'globalThis.__tonTraversalMarker = true; return "unsafe"\')})',
    {configFile: false, babelrc: false});
  try {
    babel.traverse(ast, {
      ExpressionStatement(p) {
        const result = p.get("expression").evaluate();
        expect(result.confident).toBe(false);
      }
    });
    expect(globalThis.__tonTraversalMarker).toBeUndefined();
  } finally {
    delete globalThis.__tonTraversalMarker;
  }
});
test("HTTP redirects preserve final response and convert POST on 303", async () => {
  const server = nativeHttp.createServer((req, res) => {
    if (req.url === "/redirect") { res.writeHead(303, {Location: "/final"}); res.end(); }
    else { res.end(req.method + ":" + req.url); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await new Promise((resolve, reject) => {
      const request = load("follow-redirects").http.request({
        hostname:"127.0.0.1", port:server.address().port, path:"/redirect",
        method:"POST", timeout:3000,
      }, res => {
        let value="";
        res.on("data", data => value += data);
        res.on("end", () => resolve(value));
      });
      request.on("error", reject);
      request.on("timeout", () => request.destroy(new Error("Timed out")));
      request.end("example");
    });
    expect(response).toBe("GET:/final");
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test("YAML prototype-looking keys cannot replace document prototypes", () => {
  const yaml = load("js-yaml");
  const data = yaml.safeLoad("__proto__:\n  polluted: true\nsafe: hello\n");
  expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
  expect(Object.prototype.hasOwnProperty.call(data, "__proto__")).toBe(true);
  expect(data.safe).toBe("hello");
  expect({}.polluted).toBeUndefined();
  expect(() => yaml.safeLoad('!!js/function "function () { return 1; }"')).toThrow();
});
test("brace expansion preserves nested alternatives", () => {
  expect(load("brace-expansion")("nft/{item,giver}/{1,2}.ts")).toEqual([
    "nft/item/1.ts", "nft/item/2.ts", "nft/giver/1.ts", "nft/giver/2.ts",
  ]);
});
test("browser target queries remain usable", () => {
  const targets = load("browserslist")("last 2 chrome versions");
  expect(targets.length).toBe(2);
  expect(targets.every(value => /^chrome \d+$/.test(value))).toBe(true);
});
