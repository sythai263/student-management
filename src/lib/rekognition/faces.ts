import {
  CreateCollectionCommand,
  DeleteFacesCommand,
  IndexFacesCommand,
  ResourceAlreadyExistsException,
} from "@aws-sdk/client-rekognition";
import { deleteObject, downloadObject } from "@lib/storage";
import { REKOGNITION_IMAGE_MAX_BYTES } from "@constants";
import { createRekognitionClient } from "./client";
import { getCollectionId } from "./collection";

export interface IndexedFace {
  awsFaceId: string;
  avatarKey: string;
}

/**
 * Shared face-registration pipeline used by register-student and
 * update-student. Both the original (full quality, best accuracy for
 * Rekognition) and the compressed display copy are uploaded directly
 * from the browser to storage beforehand (see `uploadDirect` /
 * `createUploadUrl`) — Server Actions never receive the raw file.
 *
 * `imageKey` is the temp original: downloaded here for IndexFaces,
 * then deleted. `avatarKey` is the compressed copy already sitting at
 * its final, permanent location — stored on the student row and served
 * back through the authenticated /api/image route.
 */
export async function indexStudentFace(
  classId: string,
  studentCode: string,
  imageKey: string,
  avatarKey: string,
): Promise<IndexedFace> {
  // Rekognition's Bytes payload caps at 5MB — camera originals can be
  // much larger, so fall back to the compressed display copy.
  let imageBytes = await downloadObject(imageKey);
  if (imageBytes.byteLength > REKOGNITION_IMAGE_MAX_BYTES) {
    imageBytes = await downloadObject(avatarKey);
  }

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

  // Temp original no longer needed once indexed.
  await deleteObject(imageKey);

  return { awsFaceId: faceRecord.Face.FaceId, avatarKey };
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
