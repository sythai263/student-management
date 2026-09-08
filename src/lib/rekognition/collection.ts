/**
 * Naming convention: each classId maps 1:1 to a Rekognition CollectionId.
 * Prevents cross-class false positives and speeds up SearchFacesByImage.
 */
export function getCollectionId(classId: string): string {
  return `class-${classId}`;
}
