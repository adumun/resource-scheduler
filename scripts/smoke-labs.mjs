#!/usr/bin/env node
/** Non-destructive HTTP smoke: the public Labs artifact must be a working SPA. */
const option = process.argv.find((item) => item.startsWith("--base="));
if (!option) {
  console.error("Usage: node scripts/smoke-labs.mjs --base=https://<preview-host>");
  process.exitCode = 2;
} else {
  try {
    const origin = new URL(option.slice("--base=".length));
    const local = origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname);
    if (
      !(origin.protocol === "https:" || local) ||
      origin.username || origin.password || origin.search || origin.hash ||
      origin.pathname !== "/"
    ) throw new Error("Specify an HTTPS origin (localhost may use HTTP) without path or credentials.");

    const cases = ["/", "/demo", "/schedules", "/schedules/new", "/login", "/register"];
    let fails = 0;
    for (const path of cases) {
      try {
        const response = await fetch(new URL(path, origin), {
          redirect: "follow",
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        });
        const type = response.headers.get("content-type") ?? "";
        const correct = response.status === 200 &&
          response.url.startsWith(origin.origin + "/") &&
          type.includes("text/html");
        console.log(`${correct ? "PASS" : "FAIL"} ${path} status=${response.status} type=${type}`);
        if (!correct) fails++;
        await response.body?.cancel();
      } catch (error) {
        fails++;
        console.error(`FAIL ${path}: ${error.message}`);
      }
    }

    const landing = await fetch(new URL("/", origin), {
      signal: AbortSignal.timeout(15_000),
    }).then((res) => res.text());
    const jsAsset = landing.match(/(?:src)="(\/assets\/[^"]+\.js)"/);
    if (!jsAsset) {
      console.log("FAIL application bundle not referenced in index HTML");
      fails++;
    } else {
      const response = await fetch(new URL(jsAsset[1], origin), {
        signal: AbortSignal.timeout(15_000),
      });
      const type = response.headers.get("content-type") ?? "";
      const correct = response.ok && /javascript|ecmascript/.test(type);
      console.log(`${correct ? "PASS" : "FAIL"} compiled JS status=${response.status} type=${type}`);
      if (!correct) fails++;
      await response.body?.cancel();
    }

    console.log(`Resource Scheduler Labs HTTP smoke: ${7 - fails}/7 PASS`);
    if (fails) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
