import type { RouteObject } from "react-router-dom";
import { ChatPage } from "~/pages/chat/ChatPage.js";
import { EvaluationPage } from "~/pages/evaluation/EvaluationPage.js";
import { JobsPage } from "~/pages/jobs/JobsPage.js";
import "~/styles.css";

/** 호스트의 라우터가 자기 셸 아래에 그대로 펼치는 라우트 배열이다. */
const routes: RouteObject[] = [
  { path: "chat", Component: ChatPage },
  { path: "chat/:threadId", Component: ChatPage },
  { path: "jobs", Component: JobsPage },
  { path: "evaluation", Component: EvaluationPage },
];

export default routes;
