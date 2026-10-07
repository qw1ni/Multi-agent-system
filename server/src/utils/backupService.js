import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execPromise = promisify(exec);

export const createDatabaseBackup = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `university_library_db_backup_${timestamp}.sql`;
    
    const backupDir = path.resolve('src', 'storage', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const outputPath = path.join(backupDir, backupFileName);
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        throw new Error('DATABASE_URL не настроена в переменных окружения');
    }

    let cleanDbUrl = dbUrl;
    try {
        const parsedUrl = new URL(dbUrl);
        parsedUrl.search = '';
        cleanDbUrl = parsedUrl.toString();
    } catch (urlError) {
        console.warn('Не удалось распарсить DATABASE_URL как URI');
    }

    const command = `pg_dump "${cleanDbUrl}" --clean > "${outputPath}"`;
    
    await execPromise(command);

    return {
        filePath: outputPath,
        fileName: backupFileName
    };
};