import { loginUserUseCase } from '../use-cases/authUseCases.js';
import { userRepository } from '../repositories/userRepository.js';
import { asyncHandler } from '../middleware/asyncHandler.js';



export const login = asyncHandler(async (req, res) => {
    if (!req.body) {
        return res.status(400).json({ message: "Не все аргументы были переданы" });
    }
    const { identifier, password } = req.body;
    if (!identifier || !password) {
        return res.status(400).json({ message: "Не все аргументы были переданы" });
    }
    const result = await loginUserUseCase(identifier, password, userRepository);
    const { token, ...clientData } = result;
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS на продакшене
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
    };
    res.cookie('token', token, cookieOptions);
    return res.status(200).json(clientData);
});

export const logout = asyncHandler(async (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    });

    return res.status(200).json({ message: "Успешный выход из системы" });
});