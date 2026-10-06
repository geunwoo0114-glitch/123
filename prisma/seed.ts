/**
 * 개발용 시드 데이터. 실제 서비스 로직(검증/권한)과 분리된 데모 데이터만 넣는다.
 * 실행: npm run db:seed  (기존 데모 계정은 지우고 다시 만든다)
 */
import { PrismaClient, type Visibility } from "@prisma/client";
import sharp from "sharp";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { missingRoomItems } from "../src/features/town/catalog";

const db = new PrismaClient();
const PASSWORD = "darak1234";
const uploadRoot = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");

function hash(pw: string) {
  const salt = randomBytes(16);
  const h = scryptSync(pw.normalize("NFKC"), salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", 32768, 8, 1, salt.toString("base64"), h.toString("base64")].join("$");
}

const palettes = [
  ["#F9C9B6", "#F5E1C8", "#9CC6DB"],
  ["#B9D8C2", "#F2E7C9", "#E8A87C"],
  ["#C3B1E1", "#F7D6E0", "#F2E8CF"],
  ["#A7C7E7", "#FDFD96", "#FFB347"],
  ["#F4A261", "#E9C46A", "#2A9D8F"],
  ["#FFCAD4", "#B0D0D3", "#C08497"],
];

/** 데모용 '사진': 부드러운 그라데이션 + 해/산 실루엣 */
async function fakePhoto(ownerId: string, i: number, w = 1200, h = 900) {
  const [a, b, c] = palettes[i % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${w * (0.25 + (i % 3) * 0.2)}" cy="${h * 0.32}" r="${h * 0.12}" fill="#fff" opacity="0.75"/>
    <path d="M0 ${h * 0.75} Q ${w * 0.25} ${h * 0.5} ${w * 0.5} ${h * 0.72} T ${w} ${h * 0.66} V ${h} H 0 Z" fill="${c}" opacity="0.85"/>
    <path d="M0 ${h * 0.85} Q ${w * 0.4} ${h * 0.7} ${w} ${h * 0.86} V ${h} H 0 Z" fill="${c}"/>
  </svg>`;
  const main = await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
  const thumb = await sharp(main).resize(480).webp({ quality: 72 }).toBuffer();
  const id = randomBytes(18).toString("base64url");
  const key = `2026/10/${id}.webp`;
  const thumbKey = `2026/10/${id}_t.webp`;
  await mkdir(path.join(uploadRoot, "2026/10"), { recursive: true });
  await writeFile(path.join(uploadRoot, key), main);
  await writeFile(path.join(uploadRoot, thumbKey), thumb);
  return db.media.create({ data: { ownerId, key, thumbKey, mime: "image/webp", width: w, height: h, bytes: main.length, dominant: a } });
}

const day = (offset: number) => {
  const d = new Date(Date.now() + offset * 86400000);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
};
const ago = (hours: number) => new Date(Date.now() - hours * 3600 * 1000);

const people = [
  { username: "minji", name: "민지", status: "오늘도 열심히", emoji: "☕", bio: "카페 탐방러. 기록하는 걸 좋아해요.\n필름 카메라 입문 중 📷", interests: ["카페", "사진", "여행"], theme: "peach", bg: "dots", avatar: { hair: 22, body: 12, glasses: 0, gesture: 0, beard: 0, bodyIcon: 0, brows: 3, eyes: 2, lips: 4, nose: 2, bg: 0 } },
  { username: "haru", name: "하루", status: "여행 중", emoji: "✈️", bio: "어디든 떠나는 사람", interests: ["여행", "사진", "산책"], theme: "sky", bg: "grid", avatar: { hair: 9, body: 6, glasses: 2, gesture: 0, beard: 0, bodyIcon: 0, brows: 1, eyes: 0, lips: 10, nose: 4, bg: 3 } },
  { username: "sena", name: "세나", status: "새 플레이리스트 만드는 중", emoji: "🎧", bio: "음악 없이는 못 살아", interests: ["음악", "아이돌", "그림"], theme: "lavender", bg: "lines", avatar: { hair: 44, body: 22, glasses: 0, gesture: 0, beard: 0, bodyIcon: 2, brows: 5, eyes: 3, lips: 20, nose: 1, bg: 4 } },
  { username: "doyun", name: "도윤", status: "시험기간 잠수", emoji: "📚", bio: "코딩하고 운동하는 대학생", interests: ["코딩", "운동", "게임"], theme: "mint", bg: "plain", avatar: { hair: 30, body: 4, glasses: 5, gesture: 0, beard: 0, bodyIcon: 0, brows: 8, eyes: 1, lips: 2, nose: 9, bg: 2 } },
  { username: "mina", name: "미나", status: "식물 키우기 3일차", emoji: "🌱", bio: "", interests: ["식물", "요리", "카페"], theme: "forest", bg: "checker", avatar: { hair: 52, body: 17, glasses: 0, gesture: 0, beard: 0, bodyIcon: 0, brows: 2, eyes: 4, lips: 14, nose: 3, bg: 6 } },
  { username: "jun", name: "준", status: "", emoji: "", bio: "고양이 집사", interests: ["반려동물", "영화"], theme: "butter", bg: "paper", avatar: { hair: 16, body: 9, glasses: 1, gesture: 0, beard: 3, bodyIcon: 0, brows: 10, eyes: 0, lips: 6, nose: 7, bg: 1 } },
];

/** 사람마다 다른 미니룸 (데모) */
const rooms = [
  { wall: 5, floor: 1, window: 0, shelf: 0, deco: 4, corner: 0, desk: 0, rug: 1 },
  { wall: 1, floor: 4, window: 2, shelf: 3, deco: 2, corner: 2, desk: 1, rug: 0 },
  { wall: 4, floor: 3, window: 1, shelf: 1, deco: 3, corner: 1, desk: 2, rug: 2 },
  { wall: 3, floor: 2, window: 3, shelf: 2, deco: 1, corner: 4, desk: 1, rug: 3 },
  { wall: 2, floor: 3, window: 0, shelf: 3, deco: 0, corner: 0, desk: 3, rug: 0 },
  { wall: 0, floor: 0, window: 0, shelf: 0, deco: 0, corner: 3, desk: 0, rug: 0 },
];

async function main() {
  await db.user.deleteMany({ where: { username: { in: people.map((p) => p.username) } } });
  const pw = hash(PASSWORD);
  const users: Record<string, string> = {};
  for (const [i, p] of people.entries()) {
    const u = await db.user.create({
      data: {
        email: `${p.username}@demo.darak.app`,
        username: p.username,
        passwordHash: pw,
        onboardedAt: new Date(),
        coins: 300 - i * 30,
        createdAt: ago(24 * (40 - i * 5)),
        coinTransactions: { create: { amount: 300 - i * 30, reason: "ADMIN", refId: "seed" } },
        profile: { create: { displayName: p.name, bio: p.bio, statusMessage: p.status, statusEmoji: p.emoji, statusUpdatedAt: p.status ? ago(i * 5 + 1) : null, interests: p.interests, avatar: p.avatar, totalVisits: [1204, 389, 4521, 97, 52, 18][i] } },
        space: { create: { themeId: p.theme, backgroundId: p.bg, layoutVariant: i === 1 ? "cover" : "classic", room: rooms[i] } },
        settings: { create: { showVisitorsPublic: i % 2 === 0 } },
      },
    });
    users[p.username] = u.id;
    // 데모 방에 쓰인 유료 아이템은 보유한 것으로
    const roomItems = missingRoomItems(rooms[i], new Set());
    if (roomItems.length) await db.userItem.createMany({ data: roomItems.map((itemId) => ({ userId: u.id, itemId })) });
  }
  const id = (n: string) => users[n];
  const pair = (a: string, b: string) => (id(a) < id(b) ? [id(a), id(b)] : [id(b), id(a)]);

  // 친구 관계 + 우리 사이 이름
  const friends: [string, string, string | null, string | null][] = [
    ["minji", "haru", "고딩친구", "고딩친구"],
    ["minji", "sena", "덕메", "카페메이트"],
    ["minji", "doyun", "동생", "누나"],
    ["haru", "sena", null, null],
    ["sena", "mina", "회사동기", "회사동기"],
  ];
  for (const [a, b, la, lb] of friends) {
    const [A, B] = pair(a, b);
    const aIsA = id(a) === A;
    await db.friendship.create({ data: { userAId: A, userBId: B, requesterId: id(a), status: "ACCEPTED", acceptedAt: ago(200), labelAtoB: aIsA ? la : lb, labelBtoA: aIsA ? lb : la } });
  }
  // 받은 친구 신청 (민지에게)
  {
    const [A, B] = pair("jun", "minji");
    await db.friendship.create({ data: { userAId: A, userBId: B, requesterId: id("jun"), message: "사진 보고 놀러왔어요! 고양이 좋아하세요?" } });
    await db.notification.create({ data: { recipientId: id("minji"), actorId: id("jun"), type: "FRIEND_REQUEST", dedupeKey: `friend-req:${A}:${B}:${id("jun")}`, preview: "사진 보고 놀러왔어요!" } });
  }
  await db.closeFriend.create({ data: { ownerId: id("minji"), friendId: id("haru") } });
  await db.follow.create({ data: { followerId: id("minji"), followingId: id("mina") } });

  // 게시물
  const posts: { by: string; body: string; mood?: string; vis: Visibility; imgs: number; h: number }[] = [
    { by: "haru", body: "제주 바다 색 실화인가요 🌊\n3일 내내 날씨 요정이었음 #제주 #여행", mood: "excited", vis: "FRIENDS", imgs: 3, h: 2 },
    { by: "sena", body: "요즘 듣는 노래들로 플레이리스트 만들었어요. 방에 BGM으로도 걸어둠 🎧 놀러와서 들어봐요", mood: "happy", vis: "PUBLIC", imgs: 0, h: 5 },
    { by: "minji", body: "필름 카메라 첫 롤 현상했다!! 생각보다 잘 나와서 행복 #필름 #카페", mood: "happy", vis: "FRIENDS", imgs: 4, h: 9 },
    { by: "doyun", body: "시험 끝나면 다 같이 보드게임 카페 가요… 살려줘", mood: "tired", vis: "FRIENDS", imgs: 0, h: 14 },
    { by: "mina", body: "몬스테라 새 잎 났어요 🌱 #식물", mood: "love", vis: "PUBLIC", imgs: 1, h: 20 },
    { by: "minji", body: "오늘의 카페: 창가 자리가 예쁜 곳. 다음엔 같이 가요 @haru", mood: "calm", vis: "PUBLIC", imgs: 1, h: 30 },
    { by: "haru", body: "친한 친구들한테만 하는 이야기: 사실 다음 달에 이사 가요 🏠", vis: "CLOSE_FRIENDS", imgs: 0, h: 40 },
  ];
  const postIds: string[] = [];
  let photoIdx = 0;
  for (const p of posts) {
    const media = [];
    for (let k = 0; k < p.imgs; k++) media.push(await fakePhoto(id(p.by), photoIdx++));
    const post = await db.post.create({
      data: {
        authorId: id(p.by),
        body: p.body,
        mood: p.mood,
        visibility: p.vis,
        tags: [...p.body.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].toLowerCase()),
        createdAt: ago(p.h),
        images: { create: media.map((m, order) => ({ mediaId: m.id, order })) },
      },
    });
    postIds.push(post.id);
  }
  // 좋아요/댓글
  for (const [pi, who] of [[0, "minji"], [0, "sena"], [2, "haru"], [2, "sena"], [2, "doyun"], [4, "minji"]] as const) {
    await db.postLike.create({ data: { postId: postIds[pi], userId: id(who) } });
    await db.post.update({ where: { id: postIds[pi] }, data: { likeCount: { increment: 1 } } });
  }
  const c1 = await db.comment.create({ data: { postId: postIds[2], authorId: id("haru"), body: "와 색감 미쳤다… 나도 필카 사고 싶어", createdAt: ago(8) } });
  await db.comment.create({ data: { postId: postIds[2], authorId: id("minji"), parentId: c1.id, body: "다음에 같이 출사 가자!", createdAt: ago(7) } });
  await db.post.update({ where: { id: postIds[2] }, data: { commentCount: 2 } });

  // 다이어리 (민지)
  const diaries = [
    { off: 0, title: "비 오는 날의 카페", body: "창밖에 비가 와서 오래 앉아 있었다. 따뜻한 라떼, 좋아하는 노래, 밀린 일기.\n별일 없는 하루가 제일 좋다.", mood: "calm", weather: "rainy", vis: "FRIENDS" as Visibility },
    { off: -2, title: "필름 현상 맡긴 날", body: "36장 중에 몇 장이나 살아 있을까. 두근두근.", mood: "excited", weather: "sunny", vis: "PRIVATE" as Visibility },
    { off: -9, title: "하루랑 한강", body: "오랜만에 하루랑 한강 산책. 고등학교 때 이야기만 세 시간 했다.", mood: "happy", weather: "windy", vis: "CLOSE_FRIENDS" as Visibility },
    { off: -365, title: "작년 오늘, 첫 출근", body: "긴장해서 점심도 제대로 못 먹었다. 1년 뒤의 나는 괜찮겠지?", mood: "thinking", weather: "cloudy", vis: "PRIVATE" as Visibility },
  ];
  for (const d of diaries) {
    await db.diaryEntry.create({ data: { authorId: id("minji"), date: day(d.off), title: d.title, body: d.body, mood: d.mood, weather: d.weather, visibility: d.vis, createdAt: ago(Math.max(1, -d.off * 24 + 3)) } });
  }
  await db.diaryEntry.create({ data: { authorId: id("sena"), date: day(-1), title: "플레이리스트 정리", body: "가을에 듣기 좋은 노래 20곡. 내 방 BGM도 바꿨다.", mood: "happy", weather: "night", visibility: "FRIENDS", createdAt: ago(20) } });

  // 사진첩
  for (const [owner, title, n, vis] of [["minji", "필름 일기", 5, "FRIENDS"], ["minji", "카페 기록", 3, "PUBLIC"], ["haru", "제주 2026", 6, "PUBLIC"]] as const) {
    const album = await db.album.create({ data: { ownerId: id(owner), title, visibility: vis, description: owner === "haru" ? "3박 4일 제주 여행" : "" } });
    for (let k = 0; k < n; k++) {
      const m = await fakePhoto(id(owner), photoIdx++, 1000, 1000);
      await db.photo.create({ data: { albumId: album.id, mediaId: m.id, caption: k === 0 ? "첫 장" : "", createdAt: ago(k + 3) } });
    }
    await db.album.update({ where: { id: album.id }, data: { photoCount: n, lastPhotoAt: ago(3) } });
  }

  // 방명록
  const gb: [string, string, string, string, boolean, string | null][] = [
    ["minji", "haru", "민지야 방 너무 예쁘다 🌷 다음 주에 카페 가자!", "tulip", false, "좋아 좋아! 내가 찾아둔 곳 있어"],
    ["minji", "sena", "BGM 추천해줘서 고마워 ㅎㅎ 자주 놀러올게", "music", false, null],
    ["minji", "doyun", "누나 생일 선물 뭐 갖고 싶어? (비밀)", "heart", true, null],
    ["haru", "minji", "여행 사진 다 보고 감 📸 부럽다 진짜", "star", false, null],
    ["sena", "mina", "동기님 방 구경 왔어요~", "clover", false, "어서와요 ☺️"],
  ];
  for (const [host, author, body, sticker, secret, reply] of gb) {
    await db.guestbookEntry.create({ data: { hostId: id(host), authorId: id(author), body, sticker, isSecret: secret, reply, repliedAt: reply ? ago(1) : null, createdAt: ago(Math.random() * 30 + 2) } });
  }
  await db.notification.create({ data: { recipientId: id("minji"), actorId: id("sena"), type: "GUESTBOOK", dedupeKey: `seed-gb-${Date.now()}`, preview: "BGM 추천해줘서 고마워 ㅎㅎ" } });
  await db.notification.create({ data: { recipientId: id("minji"), actorId: id("haru"), type: "POST_LIKE", targetId: postIds[2], dedupeKey: `like:${postIds[2]}:${id("haru")}`, preview: "필름 카메라 첫 롤 현상했다!!" } });

  // 오늘의 방문 흔적
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  for (const v of ["haru", "sena", "doyun"]) {
    await db.visit.create({ data: { hostId: id("minji"), visitorKey: `u:${id(v)}`, visitorId: id(v), day: today, traced: true, lastAt: ago(Math.random() * 5) } });
  }
  // 상점 아이템 몇 개
  await db.userItem.createMany({ data: [{ userId: id("minji"), itemId: "hair:22" }, { userId: id("minji"), itemId: "body:12" }, { userId: id("sena"), itemId: "hair:44" }, { userId: id("sena"), itemId: "body:22" }, { userId: id("sena"), itemId: "bodyIcon:2" }] });

  // 쪽지: 민지 ↔ 하루
  {
    const [A, B] = pair("minji", "haru");
    const conv = await db.conversation.create({ data: { userAId: A, userBId: B } });
    const lines: [string, string, number][] = [
      ["haru", "민지야 제주 사진 봤어? 다음엔 같이 가자 ✈️", 26],
      ["minji", "봤지!! 바다 색 미쳤더라. 겨울에 갈까?", 25.5],
      ["haru", "좋아 좋아. 그 전에 카페부터 ㅋㅋ", 3],
    ];
    for (const [who, body, h] of lines) await db.message.create({ data: { conversationId: conv.id, senderId: id(who), body, createdAt: ago(h) } });
    await db.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: ago(3), lastPreview: lines[2][1], lastSenderId: id("haru") } });
  }
  // 선물: 세나 → 민지
  await db.userItem.create({ data: { userId: id("minji"), itemId: "glasses:4" } });
  await db.gift.create({ data: { senderId: id("sena"), recipientId: id("minji"), itemId: "glasses:4", price: 40, message: "카페메이트에게 🕶️", createdAt: ago(2) } });
  await db.notification.create({ data: { recipientId: id("minji"), actorId: id("sena"), type: "GIFT", targetId: "glasses:4", dedupeKey: `seed-gift-${Date.now()}`, preview: "안경 No.04 · \"카페메이트에게 🕶️\"" } });

  console.log(`✔ 시드 완료. 데모 로그인: minji / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
