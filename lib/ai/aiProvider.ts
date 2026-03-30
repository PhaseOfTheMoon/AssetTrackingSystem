export interface AiAssessmentResult {
  condition: 'In-use' | 'In-store' | 'Spoiled';
  maintenanceNeeded: boolean;
  priority: 'none' | 'low' | 'medium' | 'high';
  issues: string[];
  fullResponse: string;
}

export interface AiProvider {
  assessAssetCondition(imageBase64: string, mimeType: string): Promise<AiAssessmentResult>;
}