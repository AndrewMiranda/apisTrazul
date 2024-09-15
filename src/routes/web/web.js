const express = require('express');
const router = express.Router();
const path = require('path');


router.get("/", (req, res) => {
    res.render("web/home");
});


router.get("/downloadTrazul", (req, res) => {
    res.render("web/downloadTrazul");
});

router.get("/aceptInvitationStaff", (req, res) => {
    res.render("redirectEmails/aceptInvitationStaff");
});

router.get("/rejectedInvitationStaff", (req, res) => {
    res.render("redirectEmails/rejectedInvitationStaff");
});

router.get("/verifyEmail", (req, res) => {
    res.render("redirectEmails/verifyEmail");
});



module.exports = router;