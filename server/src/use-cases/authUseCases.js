import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from "../errors/CommonErrors.js";

export const loginUserUseCase = async (identifier, password, userRepository) => {
    const user = await userRepository.findByIdentifier(identifier);
    if (!user) {
        throw new UnauthorizedError("Неверный логин/email или пароль");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
        throw new UnauthorizedError("Неверный логин/email или пароль");
    }

    const token = jwt.sign(
        {
            id: user.user_id,
            role: user.roles.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    return {
        token,
        role: user.roles.name,
        user: {
            id: user.user_id,
            fullName: user.full_name,
            login: user.login,
            email: user.email,
            facultyId: user.faculty_id,
            facultyName: user.faculties?.name || '',
            departmentId: user.department_id,
            departmentName: user.departments?.name || ''
        }
    };
};