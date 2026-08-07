import * as path from 'path';
import * as fs from 'fs';

const ROOT_PROJECT = path.resolve(process.cwd(), '..');
const BASE_STORAGE = path.join(ROOT_PROJECT, 'infra', 'storage');

export const STORAGE_PATHS = {
  COVERS: path.join(BASE_STORAGE, 'covers'),
  MOVIES: path.join(BASE_STORAGE, 'movies'),
};

export function ensureStorageDirectoriesExist() {
  Object.values(STORAGE_PATHS).forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}
