// config/nodemailer.js

const nodemailer = require("nodemailer");

// Configuración del servidor de envío (SMTP)
const transporter = nodemailer.createTransport({
    host: 'mail.redazul.co',
    port: 587,
    auth: {
        user: 'contacto@redazul.co',
        pass: 'iYKw4cnPhtITOoc'
    },
    tls: {
        rejectUnauthorized: false
    }
})

module.exports = transporter;