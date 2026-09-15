/** Rekognition similarity threshold for SearchFacesByImage (0-100). */
export const FACE_MATCH_THRESHOLD = 70;

/** Rekognition rejects Bytes payloads over 5MB — keep a safety margin. */
export const REKOGNITION_IMAGE_MAX_BYTES = 4.5 * 1024 * 1024;
