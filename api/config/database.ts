import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import type { User, Employee, ValidationResult, Task, ReturnReason } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storageDir = path.join(__dirname, '../../storage');
const dataFilePath = path.join(storageDir, 'data.json');

export interface Database {
  users: User[];
  employees: Employee[];
  validationResults: ValidationResult[];
  tasks: Task[];
  returnRecords: ReturnReason[];
  documents: any[];
}

const defaultData: Database = {
  users: [
    {
      id: 'user_001',
      username: 'admin',
      name: '系统管理员',
      role: 'admin',
      password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
    } as User & { password: string },
    {
      id: 'user_002',
      username: 'hr_user',
      name: '人事专员',
      role: 'hr',
      password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
    } as User & { password: string }
  ],
  employees: [],
  validationResults: [],
  tasks: [],
  returnRecords: [],
  documents: []
};

let dbCache: Database | null = null;
let fileWatcher: fs.FSWatcher | null = null;

const ensureStorageDir = (): void => {
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
};

const loadData = (): Database => {
  ensureStorageDir();

  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
    return JSON.parse(JSON.stringify(defaultData));
  }

  try {
    const content = fs.readFileSync(dataFilePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.users || !data.employees) {
      fs.writeFileSync(dataFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
      return JSON.parse(JSON.stringify(defaultData));
    }

    if (!data.documents) data.documents = [];
    if (!data.validationResults) data.validationResults = [];
    if (!data.tasks) data.tasks = [];
    if (!data.returnRecords) data.returnRecords = [];
    
    return data;
  } catch (error) {
    console.error('Error loading database, using default data:', error);
    return JSON.parse(JSON.stringify(defaultData));
  }
};

const saveData = (data: Database): void => {
  ensureStorageDir();
  const tempPath = dataFilePath + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, dataFilePath);
  dbCache = data;
};

export const getDb = (): Database => {
  if (!dbCache) {
    dbCache = loadData();
  }
  return dbCache;
};

export const persistDb = (data: Database): void => {
  saveData(data);
};

export const initDatabase = async (): Promise<boolean> => {
  try {
    const db = getDb();
    
    if (!db.users || db.users.length === 0) {
      (db as any).users = [
        {
          id: 'user_001',
          username: 'admin',
          name: '系统管理员',
          role: 'admin',
          password: bcrypt.hashSync('admin123', 10)
        },
        {
          id: 'user_002',
          username: 'hr_user',
          name: '人事专员',
          role: 'hr',
          password: bcrypt.hashSync('admin123', 10)
        }
      ];
      persistDb(db);
    }
    
    if (!fileWatcher) {
      fileWatcher = fs.watch(dataFilePath, () => {
        dbCache = null;
      });
    }
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
};

export default { getDb, persistDb, initDatabase };
