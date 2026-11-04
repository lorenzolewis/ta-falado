# One podcast feed, series named in episode titles, no seasons

All 46 lessons ship in one `/feed.xml` with `itunes:type` set to `serial`, `itunes:episode` numbered 1–46 in the original order, and the series put in the title ("Pronunciation 1 · …", "Grammar 4 · …"). We considered `itunes:season` per series, but the series aren't seasons, and apps would show labels like "S2 E4" that confuse learners. Three separate feeds would mean subscribing three times. Feed URLs are hard to change once submitted to Apple and Spotify, so the permanent domain is chosen before submission.
