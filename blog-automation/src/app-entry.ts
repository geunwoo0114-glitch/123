// 실행 파일 빌드 입구(bun build --compile). 화면 HTML을 파일 안에 넣어 Node 없이 실행된다.
// Bun 전용 import 구문이라 tsc 검사에서는 제외한다(tsconfig.json).
import uiHtml from "../ui/index.html" with { type: "text" };
import { startServer } from "./server.js";

startServer(async () => uiHtml);
