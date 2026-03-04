// middlewares/errorHandler.js
module.exports = (err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        status: false,
    });
};
