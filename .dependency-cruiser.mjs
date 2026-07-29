import { FSD, HOST_SURFACE, ROOT_DIR } from "./architecture.manifest.mjs";

// 규칙의 피연산자는 레이어 이름뿐이며 슬라이스 이름은 정규식 역참조가 센다.

const SRC = `^${ROOT_DIR}`;

// 레이어 방향이며 아래만 부른다.
const layerRules = FSD
  .map((layer, index) => ({ layer, above: FSD.slice(0, index) }))
  .filter(({ above }) => above.length > 0)
  .map(({ layer, above }) => ({
    name: `layer-${layer}`,
    comment: `${layer}는 자기보다 위 레이어를 부르지 않는다`,
    severity: "error",
    from: { path: `${SRC}/${layer}/` },
    to: { path: `${SRC}/(?:${above.join("|")})/` },
  }));

export default {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      comment: "해석할 수 없는 import는 통과한 것이 아니라 검사되지 않은 것이다",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, pathNot: `^${HOST_SURFACE}/` },
    },

    ...layerRules,

    {
      name: "slice-independent",
      comment: "같은 레이어의 슬라이스는 서로를 부르지 않는다",
      severity: "error",
      from: { path: `${SRC}/(${FSD.join("|")})/([^/]+)/` },
      to: { path: `${SRC}/$1/[^/]+/`, pathNot: `${SRC}/$1/$2/` },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    exclude: { path: "\\.test\\.tsx?$|/dist/|/build/" },
  },
};
