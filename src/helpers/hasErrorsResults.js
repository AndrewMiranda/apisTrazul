const { validationResult } = require('express-validator');


const handleValidationErrors = (req, res, next) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        const errors = result.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        console.log(errors);
        return res.status(400).json({ errors });
    }

    next();
};

module.exports = {handleValidationErrors}