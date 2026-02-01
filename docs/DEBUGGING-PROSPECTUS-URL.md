# Debugging Prospectus URL Resolution

When "View Prospectus on SEC.gov" redirects to `https://www.sec.gov/search-filings` instead of the actual filing, use this guide to diagnose and fix.

## Quick Debug

Add `?debug=1` to the prospectus-url API:

```
GET /api/sec/prospectus-url?cik=1912884&accession=0001213900-26-009439&debug=1
```

Response includes:
- `url` — The URL returned to the client (prospectus document or filing index fallback)
- `indexUrl` — The constructed SEC filing index URL
- `redirectDetected` — `true` if the SEC redirected the index fetch to search-filings
- `parsedDoc` — The document filename parsed from the index (e.g. `ea0270193-03.htm`), or `null` if fallback used

## Root Causes

### 1. SEC blocks server-side requests (Vercel/data center IPs)
The SEC may redirect or block requests from cloud provider IPs. **Fix**: Use `primaryDocument` from the SEC submissions API when available—this bypasses index parsing. Companies loaded via `fetchCompanyById` (direct navigation) get `primaryDocument` and construct the URL client-side.

### 2. Wrong CIK or accession format
- **CIK**: Use digits only; leading zeros optional. `1912884` and `0001912884` both work.
- **Accession**: SEC format is `XXXXXXXX-XX-XXXXXX` (e.g. `0001213900-26-009439`). The API normalizes `000121390026009439` → `0001213900-26-009439`.

### 3. Index parse fails; wrong document extracted
If the SEC index HTML structure changes, parsing may fail. **Fallback**: The API returns the filing index URL so users can click through manually.

## Verification Steps

1. **Direct URL test**  
   Open in a browser:  
   `https://www.sec.gov/Archives/edgar/data/1912884/000121390026009439/ea0270193-03.htm`  
   If this works, the URL is correct and the issue is in our resolution path.

2. **API debug in production**  
   `https://your-app.vercel.app/api/sec/prospectus-url?cik=1912884&accession=0001213900-26-009439&debug=1`

3. **Check `primaryDocument`**  
   For companies loaded via direct link, `fetchCompanyById` populates `primaryDocument` from SEC submissions. The client then builds the prospectus URL directly—no index parsing.

## Expected URL Format

- **Prospectus document**:  
  `https://www.sec.gov/Archives/edgar/data/{CIK}/{ACCESSION_NO_DASHES}/{DOCUMENT}.htm`

- **Filing index (fallback)**:  
  `https://www.sec.gov/Archives/edgar/data/{CIK}/{ACCESSION_NO_DASHES}/{ACCESSION_WITH_DASHES}-index.htm`

Example (Republic Power Group Ltd):
- CIK: `1912884`
- Accession: `0001213900-26-009439`
- Document: `ea0270193-03.htm`
- Prospectus: `https://www.sec.gov/Archives/edgar/data/1912884/000121390026009439/ea0270193-03.htm`
