# Lesson schema

Each lesson is one Markdown file in `src/content/lessons/`, named `<series>-<NN>.md` (`pronunciation-01.md`, `grammar-12.md`, `supplementary-02.md`). The frontmatter is checked by the Zod schema in `src/content.config.ts`; the Markdown body is the lesson's **intro**. A file that doesn't match fails `astro check` and `astro build`.

```md
---
series: pronunciation
number: 1
episode: 1
title: Pronunciation of /i/
topic: Getting the Check at a Restaurant
date: 2006-11-09
audio:
  url: /mp3/tafalado_01.mp3
  durationSeconds: 632
  bytes: 7590390
pdf:
  url: /pdf/tafalado_01.pdf
photo: # optional
  url: /images/lesson_pic_01.jpg
  alt: Two people at a restaurant table
---

There's only one Lesson #1. …
```

| Field | Rule |
| --- | --- |
| `series` | `pronunciation`, `grammar` or `supplementary` |
| `number` | Integer from 1 to the series size (24, 20, 2). Unique within its series. The URL is `/<series>/<NN>`. |
| `episode` | Integer 1–46, unique: the running order of the original feed (its "track number"). Supplementary 1 is episode 6, Grammar 1 is episode 27. Drives `itunes:episode` and "next lesson". |
| `title` | The lesson's subject, without the series prefix: `Pronunciation of /i/`, `Gostar vs. Gustar`. |
| `topic` | Optional. The cultural topic after the comma in the original title: `Getting the Check at a Restaurant`. Supplementary lessons have none. |
| `date` | The original publication date shown on the lesson page (`YYYY-MM-DD`). |
| `audio.url` | Opaque: a root-relative path (`/mp3/…`) or an absolute `http(s)` URL. Code never parses it, so moving media is a data change. |
| `audio.durationSeconds` | Integer seconds (`10:32` → 632). |
| `audio.bytes` | The MP3's exact size in bytes (the feed's enclosure `length`). |
| `pdf.url` | Same rules as `audio.url`. |
| `photo` | Optional. `url` (same rules) and `alt`, which must be non-empty. |
| body | The intro, in Markdown. Must not be empty. |

Unknown fields are rejected. Uniqueness of `episode` and of `series` + `number`, and the non-empty body, are checked across entries by `getLessons()` in `src/lib/lessons.ts`, which fails the build with the two clashing file names.

## Helpers

`src/lib/lessons.ts`: `getLessons()` (all, episode order), `lessonsBySeries(series)`, `getLesson(series, number)`, `nextLesson(lesson)` (next by episode, across series) and `lessonPath({ series, number })`.

## Fixtures

The three entries on `main` before the extraction (#3) are fixtures. `pronunciation-01.md` is the real Lesson 1. `grammar-01.md` and `supplementary-01.md` have their real title, date and intro, but point at Lesson 1's MP3 and PDF. The extraction replaces all three.
