// PROTOTYPE (#53): the home page's real lesson data, flattened for the variants.
import { formatDuration, isoDuration } from '../../lib/format';
import { SERIES, lessonPath, lessonsBySeries, shortTitle } from '../../lib/lessons';
import { SERIES_LABEL, SERIES_SIZE, type Series } from '../../lib/series';

export interface Row {
  series: Series;
  number: number;
  title: string;
  /** The title without "Pronunciation of", for places that already show the series. */
  short: string;
  topic?: string;
  duration: string;
  seconds: number;
  iso: string;
  path: string;
  filterText: string;
}

export interface SeriesGroup {
  id: Series;
  label: string;
  size: number;
  rows: Row[];
}

export async function homeData(): Promise<SeriesGroup[]> {
  return Promise.all(
    SERIES.map(async (id) => ({
      id,
      label: SERIES_LABEL[id],
      size: SERIES_SIZE[id],
      rows: (await lessonsBySeries(id)).map(({ data, body }) => ({
        series: id,
        number: data.number,
        title: data.title,
        short: shortTitle(data),
        topic: data.topic,
        duration: formatDuration(data.audio.durationSeconds),
        seconds: data.audio.durationSeconds,
        iso: isoDuration(data.audio.durationSeconds),
        path: lessonPath(data),
        filterText: [data.title, data.topic, body].filter(Boolean).join(' '),
      })),
    })),
  );
}
