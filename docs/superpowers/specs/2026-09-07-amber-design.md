# Янтарь — approved concept
User authorized implementation on 2026-09-07 after discussion. Work directly in current checkout so the running network server displays changes.

Janтарь is a spherical autumn world, radius 51.2 (80% of Khvoya), with dense red/yellow/orange trees matching Copper Grove's broadleaf form. Low rolling grassy hills, no mountains or rocky region. Small streams connect a few lakes. Trails connect evenly spread sites on all sides, a small village with NPCs and a remote inhabited forest yard. Walking is free off trails. Return travel is always available once unlocked.

Khvoya: after discovering grove, Lev's main greeting menu offers a question about its trees. He explains they came from Amber and gives item named exactly «Янтарь». Separate amber frame about ten metres from grove accepts it and opens portal; Wind Arch is unchanged. Persist unlock, item, visited places and each world's position without overwriting Khvoya. Rename all displayed «Шрам на холме» to «Кратер на холме» retaining IDs.

Implementation uses same origin and an entry router choosing existing Khvoya runtime or separate Amber runtime. Reuse character and movement with injectable surface/radius; no global terrain switch. Existing desktop/mobile controls remain usable; Amber has journal, overview, NPC dialogue, discoverable sites, sound and return portal. No dependencies, publication or new story prerequisites.

## User correction during implementation
Amber must feel like the same game: reuse the exact index.html/style.css interface, welcome screen, HUD, conversation, journal, controls, mobile menu, time panel and system map. Change planet name and rendered world only. M shows actual Amber surface; K marks Amber as current. Remove custom Amber UI/CSS. Share sky/atmosphere renderer and day/night controls; do not use fixed studio lighting.
