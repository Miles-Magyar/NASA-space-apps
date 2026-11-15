# CAD convert upstream (DWG→DXF)

Local worker intended for `CAD_CONVERT_UPSTREAM` on the Vercel `/api/cad-convert` route (or local testing).

## Run

```bash
node tools/cad-convert-upstream/server.mjs
```

Then in `.env` / Vercel:

```
CAD_CONVERT_UPSTREAM=http://127.0.0.1:8787/convert
```

## Real DWG

Install LibreDWG (`dwg2dxf`) or an ODA File Converter CLI, then:

```
CAD_CONVERT_BIN=dwg2dxf
node tools/cad-convert-upstream/server.mjs
```

The server writes a temp `.dwg`, runs `CAD_CONVERT_BIN <in> <out.dxf>`, and returns the DXF text.

## Contract

`POST /convert` with `{ "fileName": "x.dwg", "contentBase64": "..." }`  
→ `{ "dxf": "..." }` on success.
