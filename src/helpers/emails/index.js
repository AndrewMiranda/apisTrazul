async function sendMail(to, subject, templateData, templateName) {
    
    // Librerías
    const nodemailer = require("nodemailer");
    const fs = require("fs");
    const path = require("path");

    // Config sender
    const transporter = require("./config");

    const emailTemplatePath = path.join(__dirname, "./templates/"+templateName+".html");

    fs.readFile(emailTemplatePath, "utf8", (err, data) => {
        if (err) {
            console.log("Error al leer la plantilla de correo:", err);
            //throw "Error al leer la plantilla de correo: "+templateName;
        }

        // Reemplaza cada marcador de posición en la plantilla con los valores proporcionados
        Object.keys(templateData).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, "g");
            data = data.replace(regex, templateData[key]);
        });

        const mailOptions = {
            from: "RedAzul <contacto@redazul.co>",
        to,
        subject,
        html: data,
        };

        transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error al enviar el correo electrónico:", error);
            //throw "Error al enviar el correo electrónico: "+error;
        } else {
            console.log("Correo electrónico enviado:", info.response);
        }
        });
    });
}

module.exports = {sendMail};