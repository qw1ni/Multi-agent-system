import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Начало инициализации базы данных...');

    const rolesData = [
        { name: 'Администратор' },
        { name: 'Сотрудник учебного отдела' },
        { name: 'Сотрудник деканата' },
        { name: 'Сотрудник кафедры' }
    ];

    console.log('Проверка и создание ролей...');
    const createdRoles = [];

    for (const role of rolesData) {
        let existingRole = await prisma.roles.findFirst({
            where: { name: role.name }
        });

        if (!existingRole) {
            existingRole = await prisma.roles.create({
                data: role
            });
            console.log(`Роль создана: "${role.name}" (ID: ${existingRole.id})`);
        } else {
            console.log(`Роль уже существует: "${role.name}" (ID: ${existingRole.id})`);
        }
        createdRoles.push(existingRole);
    }

    const adminRole = createdRoles.find(r => r.name === 'Администратор');
    const uoRole = createdRoles.find(r => r.name === 'Сотрудник учебного отдела');
    const deanRole = createdRoles.find(r => r.name === 'Сотрудник деканата');
    const deptRole = createdRoles.find(r => r.name === 'Сотрудник кафедры');

    if (!adminRole || !uoRole || !deanRole || !deptRole) {
        throw new Error('Одна или несколько обязательных ролей не были найдены или созданы');
    }

    console.log('Поиск кафедры и факультета университета в БД...');

    const targetFacultyName = 'Электротехнический факультет';
    const targetDepartmentName = 'Кафедра "Программное обеспечение информационных технологий"';

    const existingFaculty = await prisma.faculties.findUnique({
        where: { name: targetFacultyName }
    });

    const existingDepartment = await prisma.departments.findUnique({
        where: { name: targetDepartmentName }
    });

    const adminLogin = 'Nikita';
    const adminEmail = 'admin@bru.by';
    const rawPassword = '1234nN.';

    const existingAdmin = await prisma.users.findUnique({
        where: { login: adminLogin }
    });

    if (!existingAdmin) {
        console.log('Создание учетной записи Администратора...');
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const newAdmin = await prisma.users.create({
            data: {
                full_name: 'Главный Администратор',
                email: adminEmail,
                login: adminLogin,
                password: hashedPassword,
                role_id: adminRole.id,
            }
        });

        console.log('Администратор успешно создан');
        console.log(`Логин: ${newAdmin.login} | Пароль: ${rawPassword}`);
    } else {
        console.log('Администратор уже существует в системе');
    }

    const defaultPassword = 'Password123.'; // Для сотрудников по умолчанию используется одинаковый пароль
    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10);
    const usersToSeed = [];

    // Сотрудник учебного отдела не привязан к кафедрам/факультетам, его создаем всегда
    usersToSeed.push({
        full_name: 'Иванов Иван Иванович',
        email: 'uo_staff@bru.by',
        login: 'uo_user',
        password: hashedDefaultPassword,
        role_id: uoRole.id,
        faculty_id: null,
        department_id: null,
    });

    // Сотрудник деканата и факультета создается только при наличии в БД кафедры targetDepartmentName и факультета existingFaculty
    if (existingFaculty) {
        usersToSeed.push({
            full_name: 'Петрова Елена Сергеевна',
            email: 'dean_staff@bru.by',
            login: 'dean_user',
            password: hashedDefaultPassword,
            role_id: deanRole.id,
            faculty_id: existingFaculty.id,
            department_id: null,
        });
    } else {
        console.warn(`Пропуск: Пользователь с ролью "Сотрудник деканата" не создан, так как в БД отсутствует "${targetFacultyName}".`);
    }

    if (existingFaculty && existingDepartment) {
        usersToSeed.push({
            full_name: 'Сидоров Алексей Николаевич',
            email: 'dept_staff@bru.by',
            login: 'dept_user',
            password: hashedDefaultPassword,
            role_id: deptRole.id,
            faculty_id: existingFaculty.id,
            department_id: existingDepartment.id,
        });
    } else {
        console.warn(`Пропуск: Пользователь с ролью "Сотрудник кафедры" НЕ создан, так как в БД отсутствуют необходимые факультет или кафедра`);
    }

    if (usersToSeed.length > 0) {
        console.log('Проверка и создание разрешенных учетных записей сотрудников...');
        for (const user of usersToSeed) {
            const existingUser = await prisma.users.findUnique({
                where: { login: user.login }
            });

            if (!existingUser) {
                await prisma.users.create({
                    data: {
                        full_name: user.full_name,
                        email: user.email,
                        login: user.login,
                        password: user.password,
                        role_id: user.role_id,
                        faculty_id: user.faculty_id,
                        department_id: user.department_id
                    }
                });
                console.log(`Пользователь создан: ${user.login} | Пароль: ${defaultPassword}`);
            } else {
                console.log(`Пользователь уже существует: ${user.login}`);
            }
        }
    }
}

main()
    .catch((e) => {
        console.error('Ошибка при инициализации БД:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });