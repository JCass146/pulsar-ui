// ui/src/timeseries.js
export function pushPoint(map, key, point, maxPoints = 1500) {
  let arr = map.get(key);
  if (!arr) {
    arr = [];
    map.set(key, arr);
  }
  arr.push(point);
  const extra = arr.length - maxPoints;
  if (extra > 0) arr.splice(0, extra);
}

export function getSeries(map, key) {
  return map.get(key) || [];
}
