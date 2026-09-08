import { RekognitionClient } from "@aws-sdk/client-rekognition";

/**
 * AWS Rekognition client for face indexing / searching.
 * Each classId maps to one CollectionId (see collection.ts).
 */
export function createRekognitionClient(): RekognitionClient {
  return new RekognitionClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}
