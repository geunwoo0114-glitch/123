/** 서비스 전역 설정값 (매직 넘버를 한 곳에서 관리) */
export const appConfig = {
  /** 날짜 경계(오늘 방문자, 다이어리 '지난 오늘')를 계산하는 기준 타임존 */
  serviceTimezone: "Asia/Seoul",
  session: {
    cookieName: "darak_session",
    visitorCookieName: "darak_vid",
    /** 30일 */
    maxAgeSeconds: 60 * 60 * 24 * 30,
  },
  username: {
    min: 3,
    max: 20,
    /** username 변경 후 재변경까지 대기 일수 */
    changeCooldownDays: 30,
  },
  limits: {
    postBody: 2000,
    commentBody: 500,
    guestbookBody: 500,
    diaryTitle: 80,
    diaryBody: 20000,
    bio: 160,
    statusMessage: 40,
    displayName: 24,
    albumTitle: 40,
    albumDescription: 200,
    photoCaption: 200,
    imagesPerPost: 10,
    imagesPerDiary: 6,
    photosPerUpload: 20,
    interests: 8,
    tags: 10,
  },
  upload: {
    maxBytes: 12 * 1024 * 1024,
    allowedMime: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
    maxDimension: 2048,
    thumbDimension: 480,
  },
  pageSize: {
    feed: 15,
    comments: 30,
    guestbook: 15,
    notifications: 30,
    photos: 30,
    diary: 20,
    friends: 40,
  },
} as const;
