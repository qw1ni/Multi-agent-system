export const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.roles || !allowedRoles.includes(req.user.roles.name)) {
            return res.status(403).json({
                message: 'Доступ запрещен: у вас недостаточно прав для выполнения этого действия'
            });
        }
        next();
    };
};