Guardian Quest RPG — Audio Assets
==================================

Place your custom Mother's Rosario voice-line / SFX file here as:

    audio/mother_rosario.mp3

This file plays automatically at the moment the player blinks/dashes
toward the target during the Mother's Rosario ultimate cinematic
(js/mother_rosario.js → _mrSfx_blink()).

If this file is missing, the game silently falls back to a synthesized
"blink" sound effect (Web Audio API) so nothing breaks — you'll just
hear a placeholder square-wave blip until you drop the real file in.

Requirements:
  • Format: .mp3
  • Filename: exactly "mother_rosario.mp3" (case-sensitive on most hosts)
  • Suggested length: 1–3 seconds (it plays once, non-looping)
  • Keep the file reasonably small (<500KB) for instant playback with
    no loading delay mid-cinematic
