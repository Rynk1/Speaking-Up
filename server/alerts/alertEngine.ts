import { AlertOrchestrator } from './AlertOrchestrator';
import { AlertDeliveryResult } from './adapters/types';

export class InstitutionAlertService {
  /**
   * Dispatches an alert to a tagged institution using provider-independent AlertOrchestrator
   */
  public static async dispatchAlert(postId: string, institutionId: string): Promise<AlertDeliveryResult> {
    return AlertOrchestrator.orchestrateAlert(postId, institutionId);
  }
}
