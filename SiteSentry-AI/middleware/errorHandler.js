// File: middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // Log the error to the console

    // Send a generic 500 server error
    res.status(500).json({ 
        error: 'Something went wrong on the server!' 
    });
};

module.exports = errorHandler;