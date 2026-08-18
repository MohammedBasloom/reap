# Sector photographs

The five images behind the Sectors accordion on the landing page.

| File | Sector | Served size |
|------|--------|-------------|
| `residential.jpg` | Residential / سكني | 933 × 1400 |
| `hospitality.jpg` | Hospitality / ضيافة | 933 × 1400 |
| `office.jpg` | Offices / مكاتب | 931 × 1400 |
| `retail.jpg` | Retail / تجزئة | 934 × 1400 |
| `mixed-use.jpg` | Mixed-use / متعدد الاستخدامات | 934 × 1400 |

## These are downsized copies

The originals were 4000–7360px on the long edge and **74 MB for the five**.
They are served here at 1400px long edge, quality 78 — **1.0 MB for all five**,
a 70× reduction with no visible loss at the size the panels actually draw
them. The panels are at most ~570 × 440 CSS px, so 1400px still leaves
headroom for a 2× display.

Keep the originals somewhere outside this repo. It is public, and a 74 MB
commit cannot be undone by deleting the files later — the blobs stay in
history.

## Replacing one

Portrait crops survive best: a panel is tall and narrow until it opens, and
`object-fit: cover` takes the middle. Match the naming above, keep the `.jpg`
extension the markup asks for, and downsize before committing — same 1400px
long edge, quality ~78.

Their `alt` is deliberately empty. They are decorative; the sector name beside
each one is the real text, and it stays in the DOM whether the panel is open
or not so a screen reader gets the full list.

If a file is missing the panel falls back to a navy gradient and still shows
its label, so the row degrades quietly rather than breaking.
