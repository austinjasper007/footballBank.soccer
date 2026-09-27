import { deleteObject, listAll, ref } from "firebase/storage";
import { storage } from "@/firebase/config";

async function deleteStorageFolder(folderRef) {
  const { items, prefixes } = await listAll(folderRef);

  await Promise.all(items.map((item) => deleteObject(item)));
  await Promise.all(prefixes.map((prefix) => deleteStorageFolder(prefix)));
}

export async function deleteFirebaseStorageFile(downloadUrl) {
  if (!downloadUrl) return;

  try {
    await deleteObject(ref(storage, downloadUrl));
  } catch (error) {
    if (error.code !== "storage/object-not-found") throw error;
  }
}

export async function deletePlayerMedia(email) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Cannot delete player media without an email address");
  }

  const playersRoot = ref(storage, "players");
  const { prefixes } = await listAll(playersRoot);
  const matchingFolders = prefixes.filter(
    (prefix) => prefix.name.trim().toLowerCase() === normalizedEmail,
  );

  await Promise.all(matchingFolders.map((folder) => deleteStorageFolder(folder)));
}