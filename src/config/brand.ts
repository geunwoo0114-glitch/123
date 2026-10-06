/**
 * 브랜딩 설정. 서비스 이름/문구는 여기에서만 관리한다.
 */
export const brand = {
  name: "다락",
  nameEn: "darak",
  tagline: "나만의 작은 방, 친구가 놀러 오는 곳",
  description:
    "다락은 사람마다 자기만의 공간을 갖고, 친구의 공간에 놀러 가는 SNS예요. 기록하고, 꾸미고, 방명록에 흔적을 남겨보세요.",
  /** 공간을 부르는 이름 (예: "OO의 다락") */
  spaceNoun: "다락",
  /** 미니게임 타운 재화 */
  currency: { name: "밤톨", emoji: "🌰" },
  townName: "미니게임 타운",
} as const;
