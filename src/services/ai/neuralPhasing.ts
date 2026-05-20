import type { BrandOpsData } from '../../types/domain';
import { buildOperatorTwinSystemBlock } from '../operatorTwin/buildOperatorTwinSystemBlock';

/** @deprecated Import {@link buildOperatorTwinSystemBlock} from `services/operatorTwin/buildOperatorTwinSystemBlock`. */
export function buildNeuralPhasingResumeBlock(workspace: BrandOpsData): string {
  return buildOperatorTwinSystemBlock(workspace);
}
