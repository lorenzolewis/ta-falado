---
status: proposed
---

# Serve media as Workers static assets committed to git, not from R2

The 46 MP3s, PDFs and photos (about 350 MB, each under 25 MiB) are committed to the repo and deployed as Cloudflare Workers static assets, rather than stored in R2 or Git LFS. They never change, static-asset requests are free, and one deploy keeps site and media in sync. `.gitattributes` marks them `binary`. **Accepted only once a spike shows Workers static assets answer HTTP Range requests with 206** (needed for seeking, and for iOS Safari to play at all). If they don't, the MP3s move to R2.
