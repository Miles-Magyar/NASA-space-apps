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

## Staging

1. Run the worker on a staging host reachable by Vercel. Keep it behind HTTPS. If your host requires binding to all interfaces, set `CAD_CONVERT_UPSTREAM_HOST=0.0.0.0` and use the host-assigned port via `CAD_CONVERT_UPSTREAM_PORT`.
2. Set the same `CAD_CONVERT_UPSTREAM_TOKEN` in the worker and in Vercel's staging environment. Point Vercel's `CAD_CONVERT_UPSTREAM` at the staging HTTPS URL ending in `/convert`, then redeploy.
3. In the staging CAD Checker, upload an approved native DWG with named material layers. Verify the import reports upstream conversion and that the material names and flammability rows match the drawing. The bundled `.fixture.dwg` takes a separate fixture path, so use an actual DWG to check the external converter.

For the browser workflow, use `CAD_CONVERT_UPSTREAM_TOKEN` for worker authentication. The separate `CAD_CONVERT_TOKEN` variable requires callers of Vercel's API to supply a bearer token themselves.

The worker accepts one native conversion at a time, with a 12-second conversion timeout and 3 MiB limits for the DWG and DXF.

## Contract

`POST /convert` with `{ "fileName": "x.dwg", "contentBase64": "..." }`  
→ `{ "dxf": "...", "converter": "bin" }` on success.

When configured, requests to `/convert` require the bearer token. `GET /health` reports whether the worker has a converter configured.
