import jwt from 'jsonwebtoken';
import prisma from '../repositories/prisma/prisma-client.js';

export const protect = async (req, res, next) => {
    let token;


    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.users.findUnique({
            where: { user_id: decoded.id },
            include: { roles: true }
        });

        if (!user) {
            req.user = null;
            return next();
        }

        req.user = {
            id: user.user_id,
            fullName: user.full_name,
            email: user.email,
            roles: { name: user.roles.name },
            faculty_id: user.faculty_id,
            department_id: user.department_id
        };

        return next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Невалидный токен сессии' });
    }
};