// npm start: ui/index.html을 그때그때 읽어서(고치면 새로고침만으로 반영) 프로그램을 띄운다.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { startServer } from "./server.js";
import { ROOT } from "./settings.js";

startServer(() => readFile(path.join(ROOT, "ui", "index.html"), "utf8"));
