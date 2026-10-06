/**
 * 벽 방향 계산 (three.js 없이). 편집 화면 번들을 가볍게 유지하려고 장면과 분리했다.
 * 벽 번호: 0=북(-z), 1=동(+x), 2=남(+z), 3=서(-x)
 */
export const WALL_ROTATIONS = [0, -Math.PI / 2, Math.PI, Math.PI / 2] as const;

/** 카메라 반대편(보이는) 두 벽 */
export const visibleWallsFor = (view: number) => [[0, 3], [0, 1], [1, 2], [2, 3]][view];

/** 화면 오른쪽으로 갈 때 벽 위 열 번호가 커지는지(+1) 작아지는지(-1) */
export function wallRightSign(wall: number, view: number) {
  const a = Math.PI / 4 + (view * Math.PI) / 2;
  return Math.cos(a - WALL_ROTATIONS[wall]) >= 0 ? 1 : -1;
}
