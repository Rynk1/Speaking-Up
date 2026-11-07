import { AlertOrchestrator } from './AlertOrchestrator';
import { AlertDeliveryResult } from './adapters/types';

export class InstitutionAlertService {
  /**
   * Dispatches an alert to a tagged institution using provider-independent AlertOrchestrator.
   * When `deskId` is given the alert is addressed to that specific sub-unit (MMDA desk).
   */
  public static async dispatchAlert(postId: string, institutionId: string, deskId?: string): Promise<AlertDeliveryResult> {
    return AlertOrchestrator.orchestrateAlert(postId, institutionId, { deskId });
  }
}
