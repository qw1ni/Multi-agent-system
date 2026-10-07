export const errorHandler = (err, req, res, next) => {
  console.error('[SERVER ERROR]');
  console.error(err); 
  console.error('----------------------');

  let statusCode = err.statusCode || 500;
  let message = err.message;

  // Обработка непредвиденных ошибок (программных багов)
  if (!err.isOperational) {
    statusCode = 500;

    if (process.env.NODE_ENV === 'development') {
        message = err.message || 'Внутренняя ошибка сервера';
    } else {
        message = 'Ошибка на сервере'; 
    }
  }

  res.status(statusCode).json({
    status: err.status || 'error',
    message: message,
    // Дополнительно: для фронтендеров в режиме разработки можно прокидывать и сам stack
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};