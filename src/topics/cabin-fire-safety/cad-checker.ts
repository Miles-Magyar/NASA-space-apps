/**
 * Compatibility re-exports — implementation lives under `src/topics/cad-checker/`.
 */
export type {
  BomPart,
  BomZone,
  CheckResult,
  ConcernLevel,
  UnknownMaterialCapture,
  AdjacencyEdge,
} from '../cad-checker/types';
export { checkBom, runFullCheck, buildReportPayload, reportToCsv } from '../cad-checker/engine';
export { parseBom, parseBuildFile, ACCEPTED_BUILD_ACCEPT } from '../cad-checker/parse-bom';
export {
  mountCadChecker,
  type CadCheckerOptions,
  type CadCheckerHandle,
} from '../cad-checker/mount';
