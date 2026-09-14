import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  CreateCollectionCommand,
  DeleteFacesCommand,
  IndexFacesCommand,
  ResourceAlreadyExistsException,
} from "@aws-sdk/client-rekognition";
import { createS3Client, getPublicUrl, S3_BUCKET } from "@lib/storage";
import { createRekognitionClient } from "./client";
import { getCollectionId } from "./collection";

export interface IndexedFace {
  awsFaceId: string;
  avatarUrl: string;
}

/**
 * Shared face-registration pipeline used by register-student and
 * update-student: upload portrait to S3, ensure the class collection
 * exists, IndexFaces with ExternalImageId = studentCode.
 */
export async function indexStudentFace(
  classId: string,
  studentCode: string,
  image: File,
): Promise<IndexedFace> {
  const imageBytes = new Uint8Array(await image.arrayBuffer());

  // Upload portrait to S3 (MinIO / R2).
  const objectKey = `students/${classId}/${studentCode}-${Date.now()}.jpg`;
  const s3 = createS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectKey,
      Body: imageBytes,
      ContentType: image.type || "image/jpeg",
    }),
  );
  const avatarUrl = getPublicUrl(objectKey);

  // Index face into the class's Rekognition collection.
  const rekognition = createRekognitionClient();
  const collectionId = getCollectionId(classId);
  try {
    await rekognition.send(
      new CreateCollectionCommand({ CollectionId: collectionId }),
    );
  } catch (err) {
    if (!(err instanceof ResourceAlreadyExistsException)) throw err;
  }

  const indexResult = await rekognition.send(
    new IndexFacesCommand({
      CollectionId: collectionId,
      Image: { Bytes: imageBytes },
      ExternalImageId: studentCode,
      MaxFaces: 1,
      QualityFilter: "AUTO",
    }),
  );
  const faceRecord = indexResult.FaceRecords?.[0];
  if (!faceRecord?.Face?.FaceId) {
    throw new Error("Không nhận diện được khuôn mặt trong ảnh");
  }
  return { awsFaceId: faceRecord.Face.FaceId, avatarUrl };
}

/** Remove a face vector from the class collection (best-effort). */
export async function deleteFaceVector(
  classId: string,
  faceId: string,
): Promise<void> {
  try {
    const rekognition = createRekognitionClient();
    await rekognition.send(
      new DeleteFacesCommand({
        CollectionId: getCollectionId(classId),
        FaceIds: [faceId],
      }),
    );
  } catch {
    // Stale vector still maps to the same studentCode — harmless.
  }
}
