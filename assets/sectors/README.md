# Sector photographs

The five images behind the Sectors accordion on the landing page. Drop them
here with exactly these names — the landing page references them by filename:

| File | Sector | The photograph |
|------|--------|----------------|
| `residential.jpg` | Residential / سكني | Timber-clad tower, projecting balconies with planters |
| `build-to-rent.jpg` | Build-to-Rent / تأجير سكني | White stacked balconies, DLR track and flyover below |
| `office.jpg` | Offices / مكاتب | Blue-green glass tower shot upward against cloud |
| `retail.jpg` | Retail / تجزئة | Copper fins and red spouts over a paved plaza |
| `mixed-use.jpg` | Mixed-use / متعدد الاستخدامات | Two glass volumes at dusk, lit floors inside |

`.jpg` is what the markup asks for. If yours are `.png` or `.webp`, either
convert them or change the five `src` attributes in `index.html` to match —
do not leave the extension mismatched.

Guidance for replacements: portrait or square crops survive best, since the
panels are tall and narrow until opened. Keep each file under ~400 KB — five
of these load on the landing page, and it is the first thing a visitor waits
for. They are decorative, so their `alt` is deliberately empty; the sector
name beside them is the real text.

Until a file is present the panel falls back to a navy gradient and still
shows its label, so a missing photograph degrades quietly rather than
breaking the row.
