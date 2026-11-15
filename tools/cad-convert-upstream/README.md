# CAD convert upstream (DWG→DXF)

Node worker for the Vercel `/api/cad-convert` route. It calls LibreDWG to convert a DWG to ASCII DXF, then the app extracts parts using its existing DXF importer.

## Run

```bash
node tools/cad-convert-upstream/server.mjs
```

The worker listens on loopback by default. For local testing, set the API route's upstream to:

```
CAD_CONVERT_UPSTREAM=http://127.0.0.1:8787/convert
```

## Real DWG

Install [LibreDWG](https://www.gnu.org/software/libredwg/) on the worker host, then set `CAD_CONVERT_BIN` to its executable:

```
CAD_CONVERT_BIN=dwg2dxf
node tools/cad-convert-upstream/server.mjs
```

The worker runs `dwg2dxf -o <output.dxf> <input.dwg>` in a temporary folder. An ODA installation needs a wrapper that accepts the same arguments and writes ASCII DXF.

## Container

Build the worker image from the repository root. It compiles the checksum-pinned LibreDWG 0.14 release and runs the worker as an unprivileged user.

```bash
docker build -t flame-cad-worker tools/cad-convert-upstream
docker run --rm --read-only --tmpfs /tmp:rw,nodev,nosuid,size=64m,mode=1777 \
  --cap-drop=ALL --env CAD_CONVERT_UPSTREAM_TOKEN \
  --publish 127.0.0.1:8787:8787 flame-cad-worker
```

Set `CAD_CONVERT_UPSTREAM_TOKEN` in the shell before starting the container. With a managed host, the worker uses the host's `PORT` automatically. `CAD_CONVERT_UPSTREAM_PORT` takes precedence when set. Point the health check at `GET /health`.

## Staging

1. Run the worker on a staging host reachable by Vercel. Keep it behind HTTPS. If your host requires binding to all interfaces, set `CAD_CONVERT_UPSTREAM_HOST=0.0.0.0` and use the host-assigned port via `CAD_CONVERT_UPSTREAM_PORT`.
2. Set the same `CAD_CONVERT_UPSTREAM_TOKEN` in the worker and in Vercel's staging environment. Point Vercel's `CAD_CONVERT_UPSTREAM` at the staging HTTPS URL ending in `/convert`, then redeploy.
3. In the staging CAD Checker, upload an approved native DWG with named material layers. Verify the import reports upstream conversion and that the material names and flammability rows match the drawing. The bundled `.fixture.dwg` takes a separate fixture path, so use an actual DWG to check the external converter.

For the browser workflow, use `CAD_CONVERT_UPSTREAM_TOKEN` for worker authentication. The separate `CAD_CONVERT_TOKEN` variable requires callers of Vercel's API to supply a bearer token themselves.

The worker accepts one native conversion at a time, with a 12-second conversion timeout and 3 MiB limits for the DWG and DXF.

## Staging smoke test

From the repository root, run the test against the Vercel deployment using an approved native DWG. On PowerShell:

```powershell
$env:CAD_SMOKE_API_URL = 'https://your-staging-domain/api/cad-convert'
$env:CAD_SMOKE_DWG = 'C:\path\to\approved-drawing.dwg'
$env:CAD_SMOKE_MATERIALS = 'PMMA (acrylic)'
npm test -- src/topics/cad-checker/__tests__/native-dwg.test.ts
```

Set `CAD_SMOKE_MATERIALS` to a comma-separated list of expected library match names for a tagged drawing. With the variable unset, the test checks for at least one imported candidate and a corresponding flammability result. For protected previews, the test accepts the Vercel [Protection Bypass for Automation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) secret as `VERCEL_AUTOMATION_BYPASS_SECRET`. Keep the worker token on the worker and Vercel server. The smoke client only needs `CAD_CONVERT_TOKEN` if the Vercel endpoint itself requires it.

To run the same test locally, omit `CAD_SMOKE_API_URL` and set `CAD_CONVERT_UPSTREAM` and `CAD_CONVERT_UPSTREAM_TOKEN` to the local worker settings. GitHub's **CAD native smoke** workflow follows this path with a public LibreDWG test drawing.

## Contract

`POST /convert` with `{ "fileName": "x.dwg", "contentBase64": "..." }`  
→ `{ "dxf": "...", "converter": "bin" }` on success.

When configured, requests to `/convert` require the bearer token. `GET /health` reports whether the worker has a converter configured.
