import * as path from 'path';
import * as fs from 'fs';
import { APP_ENV, NODE_ENV, STORAGE_PATH } from './constant';

const ROOT_PROJECT = path.resolve(process.cwd(), '..');

const BASE_STORAGE = STORAGE_PATH
  ? path.resolve(STORAGE_PATH)
  : path.join(
      ROOT_PROJECT,
      'infra',
      'storage',
      APP_ENV === 'prod' || NODE_ENV === 'production' ? 'prod' : 'dev',
    );

export const STORAGE_PATHS = {
  COVERS: path.join(BASE_STORAGE, 'covers'),
  MOVIES: path.join(BASE_STORAGE, 'movies'),
  TEMP: path.join(BASE_STORAGE, 'temp'),
};

export function ensureStorageDirectoriesExist() {
  const paths = [
    BASE_STORAGE,
    STORAGE_PATHS.COVERS,
    STORAGE_PATHS.MOVIES,
    STORAGE_PATHS.TEMP,
  ];
  paths.forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}
